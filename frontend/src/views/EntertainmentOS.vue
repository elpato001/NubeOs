<template>
  <div class="eos-container">
    <!-- Sidebar -->
    <aside class="eos-sidebar">
      <div class="eos-sidebar-logo">
        <Clapperboard :size="22" />
        <span>EntertainmentOS</span>
      </div>
      <nav class="eos-sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="eos-nav-item"
          :class="{ active: activeNav === item.id }"
          @click="activeNav = item.id"
        >
          <component :is="item.icon" :size="20" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="eos-sidebar-footer">
      </div>
    </aside>

    <!-- Main Content -->
    <div class="eos-main">
      <!-- Top Bar -->
      <header class="eos-topbar">
        <div class="eos-search-box">
          <Search :size="16" />
          <input type="text" placeholder="Buscar películas, series, música..." v-model="searchQuery" />
        </div>
        <div class="eos-topbar-right">
          <button class="eos-icon-btn" title="Notificaciones">
            <Bell :size="18" />
            <span class="eos-badge">3</span>
          </button>
          <div class="eos-user-pill">
            <div class="eos-user-avatar">
              <User :size="16" />
            </div>
            <span>Administrador</span>
            <ChevronDown :size="14" />
          </div>
        </div>
      </header>

      <!-- Content Area -->
      <div class="eos-content" ref="contentRef">
        
        <!-- Loading State -->
        <div v-if="loading && allMedia.length === 0" class="eos-loading-screen">
          <Loader2 class="spinning" :size="48" />
          <p>Cargando tu biblioteca...</p>
        </div>

        <!-- Home View -->
        <template v-if="activeNav === 'home' && !loading">
          <!-- Hero -->
          <section class="eos-hero" v-if="heroItems.length > 0">
            <div class="eos-hero-slider" :style="{ transform: `translateX(-${heroIndex * 100}%)` }">
              <div
                v-for="(item, i) in heroItems"
                :key="'hero-'+i"
                class="eos-hero-slide"
                :style="{ backgroundImage: `url(${item.banner})` }"
              >
                <div class="eos-hero-overlay"></div>
                <div class="eos-hero-content">
                  <h1 class="eos-hero-title">{{ item.title }}</h1>
                  <div class="eos-hero-meta">
                    <span class="eos-rating-badge">{{ item.rating }}</span>
                    <span>{{ item.duration }}</span>
                    <span>{{ item.genre }}</span>
                    <span>{{ item.year }}</span>
                  </div>
                  <p class="eos-hero-desc">{{ item.description }}</p>
                  <div class="eos-hero-actions">
                    <button class="eos-btn-primary" @click="playMedia(item)">
                      <Play :size="18" /> Reproducir
                    </button>
                    <button class="eos-btn-secondary" @click="openMediaDetail(item)">
                      <Info :size="18" /> Más Info
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button class="eos-hero-arrow left" @click="prevHero"><ChevronLeft :size="28" /></button>
            <button class="eos-hero-arrow right" @click="nextHero"><ChevronRight :size="28" /></button>
          </section>

          <!-- Favorites Section -->
          <section class="eos-media-section" v-if="favorites.length > 0">
            <div class="eos-section-header">
              <h2><Star :size="20" fill="#f59e0b" color="#f59e0b" /> Tus Favoritos</h2>
            </div>
            <div class="eos-media-row">
              <div
                v-for="fav in favorites"
                :key="'fav-'+fav.id"
                class="eos-media-card"
                @click="openMediaDetail(fav)"
              >
                <div class="eos-card-poster">
                  <img :src="fav.poster_path ? '/api/entertainment/poster/' + fav.media_id + '?token=' + token : '/entertainment/posters/stellar_horizon.png'" />
                  <div class="eos-card-overlay">
                    <Play :size="32" />
                  </div>
                </div>
                <div class="eos-card-info">
                  <div class="eos-card-title">{{ fav.title }}</div>
                  <div class="eos-card-meta">{{ fav.year }} · {{ fav.type }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- Dynamic Sections (Continue Watching, On Deck, Recently Added) -->
          <section class="eos-media-section" v-for="section in dynamicSections" :key="section.title">
            <div class="eos-section-header">
              <h2>{{ section.title }}</h2>
            </div>
            <div class="eos-media-row" v-if="section.items.length > 0">
              <div
                v-for="media in section.items"
                :key="'dyn-'+media.id"
                class="eos-media-card"
                :class="{ 'is-episode': media.type === 'series' && media.episode }"
                @click="openMediaDetail(media)"
              >
                <div class="eos-card-poster">
                  <img :src="media.poster" :alt="media.title" loading="lazy" />
                  <div class="eos-card-overlay">
                    <button class="eos-play-btn"><Play :size="24" /></button>
                  </div>
                  <span v-if="media.is_new && !media.progress" class="eos-new-badge">NUEVO</span>
                  
                  <!-- Progress Bar for Continue Watching -->
                  <div v-if="media.progress > 0" class="card-progress-bar">
                    <div class="progress-fill" :style="{ width: Math.min((media.progress / (media.runtime * 60 || 7200)) * 100, 100) + '%' }"></div>
                  </div>
                </div>
                <div class="eos-card-info">
                  <div class="eos-card-title" :title="media.title">{{ media.title }}</div>
                  <div class="eos-card-meta">
                    <template v-if="media.series_name && media.episode">
                      T{{ media.season }} E{{ media.episode }} · {{ media.series_name }}
                    </template>
                    <template v-else>
                      {{ media.year }} · {{ media.genre }}
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </template>

        <!-- Movies View -->
        <template v-if="activeNav === 'movies'">
          <section class="eos-grid-section">
            <h2 class="eos-page-title">Películas</h2>
            <div class="eos-media-grid" v-if="filteredMedia.filter(m => m.type === 'movie' || m.type === 'movies').length > 0">
              <div
                v-for="media in filteredMedia.filter(m => m.type === 'movie' || m.type === 'movies')"
                :key="'mov-'+media.id"
                class="eos-media-card"
                @click="openMediaDetail(media)"
              >
                <div class="eos-card-poster">
                  <img :src="media.poster" :alt="media.title" loading="lazy" />
                  <div class="eos-card-overlay">
                    <button class="eos-play-btn"><Play :size="24" /></button>
                  </div>
                </div>
                <div class="eos-card-info">
                  <div class="eos-card-title">{{ media.title }}</div>
                  <div class="eos-card-meta">{{ media.year }} · {{ media.genre }}</div>
                </div>
              </div>
            </div>
            <div v-else class="eos-empty-grid">Sin resultados</div>
          </section>
        </template>

        <!-- Series View -->
        <template v-if="activeNav === 'series'">
          <section class="eos-grid-section">
            <div class="series-nav-header">
              <div class="breadcrumb">
                <span @click="activeSeriesLevel = 'series'; selectedMedia = null; selectedSeason = null" :class="{ active: activeSeriesLevel === 'series' }">Series</span>
                <span v-if="selectedMedia && activeSeriesLevel !== 'series'" class="separator">/</span>
                <span v-if="selectedMedia && activeSeriesLevel !== 'series'" @click="activeSeriesLevel = 'seasons'; selectedSeason = null" :class="{ active: activeSeriesLevel === 'seasons' }">
                  {{ selectedMedia.series_name }}
                </span>
                <span v-if="selectedSeason" class="separator">/</span>
                <span v-if="selectedSeason" class="active">Temporada {{ selectedSeason.number }}</span>
              </div>
            </div>

            <!-- Level 1: Series Grid -->
            <div v-if="activeSeriesLevel === 'series'" class="eos-media-grid">
              <div v-for="media in seriesMedia" :key="'ser-'+media.id" class="eos-media-card" @click="enterSeries(media)">
                <div class="eos-card-poster">
                  <img :src="media.poster" :alt="media.title" loading="lazy" />
                  <div class="eos-card-overlay">
                    <button class="eos-play-btn"><Play :size="24" /></button>
                  </div>
                </div>
                <div class="eos-card-info">
                  <div class="eos-card-title">{{ media.series_name }}</div>
                  <div class="eos-card-meta">
                    {{ media.year }}
                    <span class="dot"></span>
                    {{ getSeasonsCount(media.series_name) }} Temporadas
                  </div>
                </div>
              </div>
              <div v-if="seriesMedia.length === 0" class="eos-empty-grid">Sin series disponibles</div>
            </div>

            <!-- Plex Style Header (Visible in Seasons and Episodes levels) -->
            <div v-if="selectedMedia && activeSeriesLevel !== 'series'" class="series-header-plex animate-fade-in">
               <div class="header-poster-container">
                 <img v-if="selectedMedia" :src="selectedMedia?.poster" class="header-poster-main" />
                 <div class="poster-footer-info" v-if="selectedMedia">
                    En progreso — T1 · E1
                 </div>
               </div>
               <div class="header-details-main">
                  <h1 class="header-title-main">{{ selectedMedia?.series_name }}</h1>
                  <div class="header-rating">
                     <Star v-for="i in 5" :key="i" :size="18" :fill="i <= 3 ? '#eab308' : 'none'" :color="i <= 3 ? '#eab308' : '#444'" />
                  </div>
                  <div class="header-actions-row">
                     <button class="btn-play-plex" @click="playMain(selectedMedia)">
                       <Play :size="20" fill="black" /> Reproducir
                     </button>
                     <button class="btn-circle-plex"><Check :size="20" /></button>
                     <button class="btn-circle-plex" @click="editMedia(selectedMedia)"><Pencil :size="20" /></button>
                     <button class="btn-circle-plex"><MoreHorizontal :size="20" /></button>
                  </div>
               </div>
            </div>

            <!-- Level 2: Seasons Grid Section -->
            <div v-if="activeSeriesLevel === 'seasons'" class="seasons-section-plex animate-fade-in">
               <h3 class="section-title-plex">Temporadas</h3>
               <div class="seasons-grid-plex">
                  <div v-for="season in currentSeasons" 
                       :key="'sea-'+season.number" 
                       class="season-card-plex" 
                       @click="enterSeason(season)"
                       :class="{ active: selectedSeason?.number === season.number }"
                   >
                     <div class="season-poster-plex">
                        <img :src="selectedMedia?.poster" />
                        <div class="season-badge-plex">{{ season.number }}</div>
                     </div>
                     <div class="season-info-plex">
                        <div class="season-name-plex">Temporada {{ season.number }}</div>
                        <div class="season-count-plex">{{ season.episodes.length }} episodio{{ season.episodes.length > 1 ? 's' : '' }}</div>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Level 3: Episodes Grid -->
            <div v-if="activeSeriesLevel === 'episodes'" class="episodes-detailed-grid">
               <div v-for="ep in selectedSeason.episodes" :key="'ep-'+ep.id" class="episode-card" @click="playMedia(ep)">
                  <div class="episode-thumb-container">
                     <img :src="ep.poster || selectedMedia.poster" class="episode-thumb" />
                     <div class="episode-play-overlay"><Play :size="24" fill="currentColor" /></div>
                     <div v-if="ep.progress" class="episode-progress">
                        <div class="progress-fill" :style="{ width: (ep.progress / (ep.runtime || 3600) * 100) + '%' }"></div>
                     </div>
                  </div>
                  <div class="episode-info">
                     <div class="ep-num">Capítulo {{ ep.episode.toString().padStart(2, '0') }}</div>
                     <div class="ep-title">{{ ep.title }}</div>
                     <div class="ep-meta" v-if="ep.runtime">{{ Math.floor(ep.runtime / 60) }} min</div>
                  </div>
               </div>
            </div>
          </section>
        </template>

        <!-- Music View -->
        <template v-if="activeNav === 'music'">
          <div class="eos-music-app">
            <header class="music-header">
              <div class="music-tabs">
                <button :class="{ active: activeMusicTab === 'artists' }" @click="activeMusicTab = 'artists'"><User :size="16" /> Artistas</button>
                <button :class="{ active: activeMusicTab === 'albums' }" @click="activeMusicTab = 'albums'"><Disc :size="16" /> Álbumes</button>
                <button :class="{ active: activeMusicTab === 'songs' }" @click="activeMusicTab = 'songs'"><Music :size="16" /> Canciones</button>
                <button :class="{ active: activeMusicTab === 'genres' }" @click="activeMusicTab = 'genres'"><Mic2 :size="16" /> Géneros</button>
                <button :class="{ active: activeMusicTab === 'playlists' }" @click="activeMusicTab = 'playlists'"><ListMusic :size="16" /> Playlists</button>
              </div>
            </header>

            <div class="music-content animate-fade">
              <!-- Artists Tab -->
              <div v-if="activeMusicTab === 'artists'" class="music-grid-view">
                <div v-for="artist in musicArtists" :key="artist.name" class="music-item-card artist" @click="searchQuery = artist.name; activeMusicTab = 'songs'">
                  <div class="artist-avatar" :style="{ background: artist.color }">
                    <User :size="48" />
                  </div>
                  <div class="item-info">
                    <div class="item-name">{{ artist.name }}</div>
                    <div class="item-meta">{{ artist.count }} canciones</div>
                  </div>
                </div>
              </div>

              <!-- Albums Tab -->
              <div v-if="activeMusicTab === 'albums'" class="music-grid-view">
                <div v-for="album in musicAlbums" :key="album.name" class="music-item-card album" @click="searchQuery = album.name; activeMusicTab = 'songs'">
                  <div class="album-cover" :style="{ background: album.color }">
                    <img v-if="album.poster" :src="album.poster" class="album-img" @error="(e: any) => e.target.style.display='none'" />
                    <Disc v-else :size="48" />
                  </div>
                  <div class="item-info">
                    <div class="item-name" :title="album.name">{{ album.name }}</div>
                    <div class="item-artist">{{ album.artist }}</div>
                    <div class="item-meta">{{ album.year }} · {{ album.count }} pistas</div>
                  </div>
                </div>
              </div>

              <!-- Songs Tab (Table) -->
              <div v-if="activeMusicTab === 'songs'" class="music-table-view">
                <table class="song-table">
                  <thead>
                    <tr>
                      <th width="40">#</th>
                      <th>Título</th>
                      <th>Artista</th>
                      <th>Álbum</th>
                      <th width="80">Año</th>
                      <th width="80">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(track, index) in musicTracks" :key="track.id" @dblclick="playMedia(track)">
                      <td class="text-center opacity-50">{{ index + 1 }}</td>
                      <td>
                        <div class="song-cell">
                          <button class="song-play-inline" @click="playMedia(track)"><Play :size="14" /></button>
                          <span>{{ track.title }}</span>
                        </div>
                      </td>
                      <td class="opacity-80">{{ track.artist }}</td>
                      <td class="opacity-80">{{ track.album }}</td>
                      <td class="opacity-50">{{ track.year }}</td>
                      <td>
                        <div class="table-btns">
                          <button @click="toggleFavorite(track)" :class="{ 'text-amber-500': isFavorite(track) }">
                            <Star :size="14" :fill="isFavorite(track) ? 'currentColor' : 'none'" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-if="musicTracks.length === 0" class="no-results py-12">
                   <p>No se encontraron canciones que coincidan con tu búsqueda.</p>
                </div>
              </div>

              <!-- Genres Tab -->
              <div v-if="activeMusicTab === 'genres'" class="music-grid-view">
                <div v-for="genre in musicGenres" :key="genre.name" class="music-item-card genre" @click="searchQuery = genre.name; activeMusicTab = 'songs'">
                  <div class="genre-box" :style="{ background: genre.color }">
                    <span>{{ genre.name }}</span>
                  </div>
                  <div class="item-info">
                    <div class="item-meta">{{ genre.count }} pistas</div>
                  </div>
                </div>
              </div>

              <!-- Playlists Tab -->
              <div v-if="activeMusicTab === 'playlists'" class="music-empty-state">
                <ListMusic :size="64" opacity="0.1" />
                <h3>Mis Playlists</h3>
                <p>Próximamente: Crea y gestiona tus propias listas de reproducción.</p>
                <button class="eos-btn-primary mini mt-4" disabled><Plus :size="16" /> Crear Nueva</button>
              </div>
            </div>
          </div>
        </template>

        <!-- IPTV View -->
        <template v-if="activeNav === 'iptv'">
          <div class="eos-iptv-container">
            <!-- IPTV Sidebar -->
            <aside class="iptv-side">
              <div class="iptv-side-header">
                <h3>Listas IPTV</h3>
                <button v-if="isAdmin" @click="activeAdminTab = 'iptv'; activeNav = 'admin'" class="iptv-add-btn" title="Gestionar Listas">
                   <Settings2 :size="16" />
                </button>
              </div>
              <div class="iptv-list-selector">
                <button 
                  v-for="list in iptvLists" 
                  :key="list.id" 
                  class="iptv-list-item"
                  :class="{ active: selectedIptvList?.id === list.id }"
                  @click="selectIptvList(list)"
                >
                  <ListMusic :size="18" />
                  <span>{{ list.name }}</span>
                </button>
                <div v-if="iptvLists.length === 0" class="iptv-empty">
                   No hay listas añadidas.
                </div>
              </div>

              <template v-if="selectedIptvList && parsedIptvData">
                <div class="iptv-side-header mt-4">
                  <h3>Categorías</h3>
                </div>
                <div class="iptv-cat-selector">
                  <button 
                    v-for="cat in parsedIptvData.categories" 
                    :key="cat.name" 
                    class="iptv-cat-item"
                    :class="{ active: selectedIptvCat?.name === cat.name }"
                    @click="selectedIptvCat = cat"
                  >
                    <span>{{ cat.name }}</span>
                    <span class="cat-count">{{ cat.channels.length }}</span>
                  </button>
                </div>
              </template>
            </aside>

            <!-- IPTV Main -->
            <div class="iptv-main">
              <template v-if="loadingIptv">
                <div class="iptv-loading">
                  <Loader2 class="spinning" :size="32" />
                  <p>Cargando canales...</p>
                </div>
              </template>
              <template v-else-if="selectedIptvCat">
                <div class="iptv-channels-grid">
                  <div 
                    v-for="ch in selectedIptvCat.channels" 
                    :key="ch.url" 
                    class="iptv-channel-card"
                    @click="playIptv(ch)"
                  >
                    <div class="ch-logo">
                       <img v-if="ch.logo" :src="ch.logo" :alt="ch.name" />
                       <MonitorPlay v-else :size="32" opacity="0.3" />
                       <div class="ch-play-overlay"><Play :size="24" /></div>
                    </div>
                    <div class="ch-info">
                       <div class="ch-name">{{ ch.name }}</div>
                    </div>
                  </div>
                </div>
              </template>
              <div v-else class="iptv-welcome">
                <MonitorPlay :size="64" opacity="0.1" />
                <h2>Televisión en Vivo</h2>
                <p>Selecciona una lista y una categoría para comenzar a ver.</p>
              </div>
            </div>
          </div>
        </template>

        <!-- Admin View -->
        <template v-if="activeNav === 'admin'">
          <div class="eos-admin-container">
            <header class="eos-admin-header">
              <h1><Settings2 :size="24" /> Panel de Administración</h1>
              <div class="admin-tabs">
                <button :class="{ active: activeAdminTab === 'overview' }" @click="activeAdminTab = 'overview'; fetchConfig()">Resumen</button>
                <button :class="{ active: activeAdminTab === 'scraper' }" @click="activeAdminTab = 'scraper'"><Zap :size="14" /> Scraper</button>
                <button :class="{ active: activeAdminTab === 'media' }" @click="activeAdminTab = 'media'">Gestión</button>
                <button :class="{ active: activeAdminTab === 'libraries' }" @click="activeAdminTab = 'libraries'">Librerías</button>
                <button :class="{ active: activeAdminTab === 'iptv' }" @click="activeAdminTab = 'iptv'">IPTV</button>
                <button :class="{ active: activeAdminTab === 'config' }" @click="activeAdminTab = 'config'; fetchConfig()">Configuración</button>
              </div>
            </header>

            <div class="eos-admin-content">
              <div v-if="activeAdminTab === 'overview'" class="admin-overview">
                <div class="stats-grid">
                  <div class="stat-card">
                    <Film :size="24" />
                    <div class="stat-val">{{ adminStats.movies }}</div>
                    <div class="stat-label">Películas</div>
                  </div>
                  <div class="stat-card">
                    <Tv :size="24" />
                    <div class="stat-val">{{ adminStats.series }}</div>
                    <div class="stat-label">Series</div>
                  </div>
                  <div class="stat-card">
                    <Music :size="24" />
                    <div class="stat-val">{{ adminStats.music }}</div>
                    <div class="stat-label">Canciones</div>
                  </div>
                  <div class="stat-card success" v-if="adminStats.identified > 0">
                    <CheckCircle2 :size="24" />
                    <div class="stat-val">{{ adminStats.identified }}</div>
                    <div class="stat-label">Identificados (TMDB)</div>
                  </div>
                  <div class="stat-card warning" v-if="adminStats.noPoster > 0">
                    <AlertCircle :size="24" />
                    <div class="stat-val">{{ adminStats.noPoster }}</div>
                    <div class="stat-label">Sin Poster</div>
                  </div>
                  <div class="stat-card info" v-if="adminStats.noNfo >= 0">
                    <FileText :size="24" />
                    <div class="stat-val">{{ adminStats.noNfo }}</div>
                    <div class="stat-label">Sin NFO</div>
                  </div>
                </div>
              </div>

              <!-- Scraper & NFO Tab -->
              <div v-if="activeAdminTab === 'scraper'" class="admin-libraries animate-fade">
                <!-- Scraper Action Cards -->
                <div class="scraper-hero">
                  <div class="scraper-hero-content">
                    <h2><Zap :size="24" /> Scraper & Identificación</h2>
                    <p>Identifica y organiza tu biblioteca automáticamente usando The Movie Database (TMDB). Los archivos NFO se generan junto a cada archivo para compatibilidad con Kodi y MediaElch.</p>
                  </div>
                </div>

                <div class="scraper-actions-grid">
                  <!-- Bulk Identify -->
                  <div class="scraper-action-card">
                    <div class="sac-icon tmdb"><Search :size="28" /></div>
                    <div class="sac-body">
                      <h3>Auto-Identificar Todo</h3>
                      <p>Busca automáticamente en TMDB todos los medios que aún no han sido identificados. Descarga posters, sinopsis, elenco y más.</p>
                      <div class="sac-stat" v-if="adminStats.identified >= 0">
                        <span class="sac-stat-num">{{ (allAdminMedia.length - (adminStats.identified || 0)) }}</span> sin identificar
                      </div>
                    </div>
                    <button @click="bulkIdentify" class="eos-btn-primary" :disabled="bulkIdentifying">
                      <Loader2 v-if="bulkIdentifying" :size="18" class="spinning" />
                      <Zap v-else :size="18" />
                      {{ bulkIdentifying ? 'Identificando...' : 'Identificar Todo' }}
                    </button>
                  </div>

                  <!-- Bulk NFO Write -->
                  <div class="scraper-action-card">
                    <div class="sac-icon nfo"><FileText :size="28" /></div>
                    <div class="sac-body">
                      <h3>Generar Archivos NFO</h3>
                      <p>Crea archivos .nfo compatibles con Kodi/MediaElch junto a cada archivo de video. Almacena toda la metadata localmente.</p>
                      <div class="sac-stat" v-if="adminStats.noNfo >= 0">
                        <span class="sac-stat-num">{{ adminStats.noNfo }}</span> sin NFO
                      </div>
                    </div>
                    <button @click="bulkWriteNfo" class="eos-btn-primary" :disabled="bulkWritingNfo">
                      <Loader2 v-if="bulkWritingNfo" :size="18" class="spinning" />
                      <Download v-else :size="18" />
                      {{ bulkWritingNfo ? 'Generando...' : 'Generar NFOs' }}
                    </button>
                  </div>

                  <!-- Scan Libraries -->
                  <div class="scraper-action-card">
                    <div class="sac-icon scan"><RotateCcw :size="28" /></div>
                    <div class="sac-body">
                      <h3>Escanear Bibliotecas</h3>
                      <p>Recorre todas las carpetas de tu biblioteca para descubrir archivos nuevos e intentar identificarlos automáticamente.</p>
                      <div class="sac-stat">
                        <span class="sac-stat-num">{{ libraries.length }}</span> librerías configuradas
                      </div>
                    </div>
                    <button @click="scanLibraries" class="eos-btn-primary" :disabled="scanning">
                      <Loader2 v-if="scanning" :size="18" class="spinning" />
                      <RotateCcw v-else :size="18" />
                      {{ scanning ? 'Escaneando...' : 'Escanear Todo' }}
                    </button>
                  </div>
                </div>

                <!-- Unidentified Media List -->
                <div class="table-container mt-6" v-if="unidentifiedMedia.length > 0">
                  <div class="table-header">
                    <h3><AlertCircle :size="16" /> Medios sin Identificar ({{ unidentifiedMedia.length }})</h3>
                  </div>
                  <div class="eos-scroll-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Poster</th>
                          <th>Título / Archivo</th>
                          <th>Tipo</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="m in unidentifiedMedia" :key="'unid-'+m.id">
                          <td class="td-poster">
                            <div class="mini-poster" :style="{ backgroundImage: `url(${m.poster_path ? '/api/entertainment/poster/' + m.id + '?token=' + token : '/entertainment/posters/stellar_horizon.png'})` }"></div>
                          </td>
                          <td>
                            <div class="media-title-stack">
                              <span class="m-title">{{ m.title }}</span>
                              <code class="file-path-code">{{ m.file_path.split('/').pop() }}</code>
                            </div>
                          </td>
                          <td><span class="type-tag">{{ m.type }}</span></td>
                          <td>
                            <div class="status-badges">
                              <span class="status-badge danger"><AlertCircle :size="12" /> Sin TMDB</span>
                              <span class="status-badge" :class="m.nfo_path ? 'ok' : 'muted'"><FileText :size="12" /> {{ m.nfo_path ? 'NFO ✓' : 'Sin NFO' }}</span>
                            </div>
                          </td>
                          <td class="table-btns">
                            <button @click="openIdentify(m)" class="btn-edit" title="Identificar manualmente"><Search :size="14" /></button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div v-if="activeAdminTab === 'media'" class="admin-libraries">
                <div class="media-management-grid">
                  <div class="table-container">
                    <div class="table-header">
                      <h3>Gestión Global de Medios ({{ allAdminMedia.length }})</h3>
                      <div style="display:flex;gap:0.75rem;align-items:center">
                        <div class="mini-search">
                          <Search :size="14" />
                          <input v-model="adminSearch" type="text" placeholder="Buscar en todo el catálogo..." />
                        </div>
                      </div>
                    </div>
                    <div class="eos-scroll-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Poster</th>
                            <th>Título / Metadata</th>
                            <th>Tipo</th>
                            <th>Estado</th>
                            <th>Archivo</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="m in filteredAdminMedia" :key="'admmedia-'+m.id">
                            <td class="td-poster">
                              <div class="mini-poster" :style="{ backgroundImage: `url(${m.poster_path ? '/api/entertainment/poster/' + m.id + '?token=' + token : '/entertainment/posters/stellar_horizon.png'})` }"></div>
                            </td>
                            <td>
                              <div class="media-title-stack">
                                <span class="m-title">{{ m.title }}</span>
                                <span class="m-year">{{ m.year }} · {{ m.genre }}</span>
                                <div class="m-rating" v-if="m.rating">⭐ {{ m.rating }}</div>
                                <div class="m-extra" v-if="m.director">🎬 {{ m.director }}</div>
                                <div class="m-extra" v-if="m.set_name">📦 {{ m.set_name }}</div>
                              </div>
                            </td>
                            <td><span class="type-tag">{{ m.type }}</span></td>
                            <td>
                              <div class="status-badges">
                                <span class="status-badge" :class="m.tmdb_id ? 'ok' : 'danger'">
                                  <CheckCircle2 v-if="m.tmdb_id" :size="12" />
                                  <AlertCircle v-else :size="12" />
                                  {{ m.tmdb_id ? 'TMDB' : 'Sin ID' }}
                                </span>
                                <span class="status-badge" :class="m.nfo_path ? 'ok' : 'muted'">
                                  <FileText :size="12" />
                                  {{ m.nfo_path ? 'NFO' : '—' }}
                                </span>
                              </div>
                            </td>
                            <td><code class="file-path-code" :title="m.file_path">{{ m.file_path.split('/').pop() }}</code></td>
                            <td class="table-btns">
                              <button @click="openIdentify(m)" class="btn-edit" title="Identificar (TMDB)"><Search :size="14" /></button>
                              <button @click="writeNfoSingle(m.id)" class="btn-nfo" title="Escribir NFO" v-if="m.tmdb_id && !m.nfo_path"><FileText :size="14" /></button>
                              <button @click="deleteMedia(m.id)" class="btn-del" title="Eliminar"><Trash2 :size="14" /></button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="activeAdminTab === 'libraries'" class="admin-libraries">
                
                <!-- Library Detail View -->
                <template v-if="selectedAdminLibrary">
                  <header class="detail-header">
                    <button @click="selectedAdminLibrary = null" class="back-link">
                      <ChevronLeft :size="18" /> Volver a librerías
                    </button>
                    <div class="header-main">
                      <div class="lib-info-pill">
                         <component :is="getLibIcon(selectedAdminLibrary.name)" :size="24" />
                         <div>
                            <h2>{{ selectedAdminLibrary.name }}</h2>
                            <code class="text-xs">{{ selectedAdminLibrary.path }}</code>
                         </div>
                      </div>
                      <div class="header-actions">
                        <button @click="scanLibraries" class="scan-action-btn" :disabled="scanning">
                          <Loader2 v-if="scanning" class="spinning" :size="16" />
                          <RotateCcw v-else :size="16" />
                          <span>Escanear esta carpeta</span>
                        </button>
                        <button @click="removeLibrary(selectedAdminLibrary.id); selectedAdminLibrary = null" class="btn-del-main">
                          <Trash2 :size="16" />
                        </button>
                      </div>
                    </div>
                  </header>

                  <div class="detail-content">
                    <div class="media-management-grid">
                      <div class="table-container">
                        <div class="table-header">
                          <h3>Contenido de la Librería ({{ libraryMedia.length }})</h3>
                          <div class="mini-search">
                            <Search :size="14" />
                            <input v-model="adminSearch" type="text" placeholder="Filtrar en esta librería..." />
                          </div>
                        </div>
                        <div class="eos-scroll-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Poster</th>
                                <th>Título / Metadata</th>
                                <th>Tipo</th>
                                <th>Ruta de Archivo</th>
                                <th>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="m in filteredLibraryMedia" :key="'libmedia-'+m.id">
                                <td class="td-poster">
                                  <div class="mini-poster" :style="{ backgroundImage: `url(${m.poster_path ? '/api/entertainment/poster/' + m.id + '?token=' + token : '/entertainment/posters/stellar_horizon.png'})` }"></div>
                                </td>
                                <td>
                                  <div class="media-title-stack">
                                    <span class="m-title">{{ m.title }}</span>
                                    <span class="m-year">{{ m.year }} · {{ m.genre }}</span>
                                    <div class="m-rating" v-if="m.rating">⭐ {{ m.rating }}</div>
                                  </div>
                                </td>
                                <td><span class="type-tag">{{ m.type }}</span></td>
                                <td><code class="file-path-code" :title="m.file_path">{{ m.file_path.split('/').pop() }}</code></td>
                                <td class="table-btns">
                                  <button @click="openIdentify(m)" class="btn-edit" title="Identificar (TMDB)"><Search :size="14" /></button>
                                  <button @click="deleteItem(m.id)" class="btn-del" title="Eliminar"><Trash2 :size="14" /></button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <div v-if="libraryMedia.length === 0" class="no-results py-8">
                            <MonitorPlay :size="48" class="mx-auto mb-4 opacity-20" />
                            <p>No se encontraron medios en esta carpeta.</p>
                            <p class="text-xs mt-2 text-slate-500">Asegúrate de que los archivos de video existan y usa el botón "Escanear esta carpeta".</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Libraries List View (Existing) -->
                <template v-else>
                  <!-- Add Library Section -->
                <div class="admin-setup-banner">
                  <div class="banner-content">
                    <h3>Añadir Nueva Librería</h3>
                    <p>Conecta tus carpetas locales para que EntertainmentOS las organice por ti.</p>
                  </div>
                  <div class="lib-add-form-premium">
                    <div class="input-group">
                      <input v-model="newLibPath" type="text" placeholder="Ej: /mnt/media/peliculas" />
                      <button @click="openFolderPicker" class="browse-btn" title="Explorar Sistema">
                        <Folder :size="18" />
                      </button>
                    </div>
                    <select v-model="selectedLibType" class="lib-type-select">
                      <option value="movie">Películas</option>
                      <option value="series">Series</option>
                      <option value="music">Música</option>
                    </select>
                    <button @click="addLibrary" class="eos-btn-primary">
                      <Plus :size="18" /> <span>Añadir</span>
                    </button>
                  </div>
                </div>

                <!-- Existing Libraries Grid -->
                <div class="lib-grid-container">
                  <header class="section-header">
                    <h3>Bibliotecas Actuales</h3>
                    <button @click="scanLibraries" class="scan-action-btn" :disabled="scanning">
                      <Loader2 v-if="scanning" class="spinning" :size="16" />
                      <RotateCcw v-else :size="16" />
                      <span>{{ scanning ? 'Escaneando...' : 'Escanear Servidor' }}</span>
                    </button>
                  </header>

                  <div class="lib-grid">
                    <div v-for="lib in libraries" :key="'lib-'+lib.id" class="lib-card selectable" @click="enterLibraryDetail(lib)">
                      <div class="lib-card-icon">
                        <component :is="getLibIcon(lib.name)" :size="32" />
                      </div>
                      <div class="lib-card-body">
                        <div class="lib-card-header">
                          <h4>{{ lib.name }}</h4>
                          <span class="lib-type-tag">{{ lib.type === 'movie' ? 'Película' : lib.type === 'series' ? 'Serie' : 'Música' }}</span>
                        </div>
                        <code title="Ruta absoluta">{{ lib.path }}</code>
                      </div>
                      <div class="lib-card-actions">
                        <button @click="removeLibrary(lib.id)" class="item-action-btn delete" title="Eliminar Biblioteca">
                          <Trash2 :size="16" />
                        </button>
                      </div>
                    </div>

                    <!-- Empty State -->
                    <div v-if="libraries.length === 0" class="lib-empty-state">
                      <Folder :size="48" opacity="0.2" />
                      <p>No hay librerías configuradas.</p>
                    </div>
                  </div>
                </div>
              </template>
            </div>

              <!-- IPTV Management Tab -->
              <div v-if="activeAdminTab === 'iptv'" class="admin-libraries">
                <div class="admin-setup-banner">
                  <div class="banner-content">
                    <h3>Añadir Lista IPTV (m3u)</h3>
                    <p>Introduce una URL de una lista m3u para disfrutar de canales en vivo.</p>
                  </div>
                  <div class="lib-add-form-premium">
                    <input v-model="newIptvName" type="text" placeholder="Nombre (Ej: Latino TV)" style="max-width: 200px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0.75rem; color: white" />
                    <input v-model="newIptvUrl" type="text" placeholder="URL m3u (http://...)" style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0.75rem; color: white" />
                    <button @click="addIptvList" class="eos-btn-primary" :disabled="loading">
                      <Plus :size="18" /> <span>Añadir</span>
                    </button>
                  </div>
                </div>

                <div class="lib-grid-container">
                  <header class="section-header">
                    <h3>Listas Configuradas</h3>
                  </header>
                  <div class="lib-grid">
                    <div v-for="list in iptvLists" :key="'iptv-'+list.id" class="lib-card">
                      <div class="lib-card-icon">
                        <MonitorPlay :size="32" />
                      </div>
                      <div class="lib-card-body">
                        <div class="lib-card-header">
                          <h4>{{ list.name }}</h4>
                        </div>
                        <code class="text-xs opacity-50 truncate block" style="max-width: 200px">{{ list.url }}</code>
                      </div>
                      <div class="lib-card-actions">
                        <button @click="deleteIptvList(list.id)" class="item-action-btn delete">
                          <Trash2 :size="16" />
                        </button>
                      </div>
                    </div>
                    <div v-if="iptvLists.length === 0" class="lib-empty-state">
                      <MonitorPlay :size="48" opacity="0.2" />
                      <p>No hay listas configuradas.</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Global Configuration Tab -->
              <div v-if="activeAdminTab === 'config'" class="admin-view animate-fade">
                <div class="config-grid">
                  <div class="config-card">
                    <div class="config-card-header">
                      <Settings2 :size="24" class="text-indigo-400" />
                      <h3>The Movie Database (TMDB)</h3>
                    </div>
                    <div class="config-card-body">
                      <p class="text-sm text-slate-400 mb-4">
                        Ingresa tu clave de API de TMDB para descargar automáticamente posters, sinopsis y valoraciones.
                      </p>
                      <div class="eos-field">
                        <label>API Key (v3 auth)</label>
                        <div class="input-with-action">
                          <input v-model="tmdbKey" type="password" placeholder="Tu clave de API..." />
                          <button @click="saveConfig" class="eos-btn-primary" :disabled="loading">
                            <Loader2 v-if="loading" :size="18" class="animate-spin" />
                            <span v-else>Guardar</span>
                          </button>
                        </div>
                        <span v-if="configData.has_key" class="text-xs text-green-500 mt-2 block">
                          ✓ Clave configurada correctamente: {{ configData.tmdb_api_key }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </template>
      </div>

      <!-- Detail Modal (Movies Only) -->
      <Transition name="modal-fade">
        <div v-if="selectedMedia && (selectedMedia.type === 'movie' || selectedMedia.type === 'movies')" class="eos-modal-overlay" @click.self="selectedMedia = null">
          <div class="eos-modal">
            <button class="eos-modal-close" @click="selectedMedia = null"><X :size="20" /></button>
            <div class="eos-modal-banner" :style="{ backgroundImage: `url(${selectedMedia?.banner_path ? '/api/entertainment/banner/' + selectedMedia.id + '?token=' + token : selectedMedia?.poster})` }">
              <div class="eos-modal-banner-overlay"></div>
              <div class="eos-modal-banner-content">
                <h2>{{ selectedMedia.title }}</h2>
              </div>
            </div>
            <div class="eos-modal-body">
              <p v-if="selectedMedia.tagline" class="eos-modal-tagline">{{ selectedMedia.tagline }}</p>
              <p class="eos-modal-desc">{{ selectedMedia.description || 'Sin descripción disponible.' }}</p>
              
              <div class="eos-modal-meta-grid" v-if="selectedMedia.director || selectedMedia.runtime || selectedMedia.certification">
                <div class="meta-item" v-if="selectedMedia.director">
                  <span class="meta-label">Director</span>
                  <span class="meta-value">{{ selectedMedia.director }}</span>
                </div>
                <div class="meta-item" v-if="selectedMedia.runtime">
                  <span class="meta-label">Duración</span>
                  <span class="meta-value">{{ selectedMedia.runtime }} min</span>
                </div>
                <div class="meta-item" v-if="selectedMedia.certification">
                  <span class="meta-label">Clasificación</span>
                  <span class="meta-value cert-badge">{{ selectedMedia.certification }}</span>
                </div>
                <div class="meta-item" v-if="selectedMedia.studio">
                  <span class="meta-label">Estudio</span>
                  <span class="meta-value">{{ selectedMedia.studio }}</span>
                </div>
              </div>

              <!-- CAST SECTION -->
              <div class="eos-modal-cast" v-if="getCast(selectedMedia).length > 0">
                <h3>Reparto Principal</h3>
                <div class="cast-scroll">
                  <div v-for="actor in getCast(selectedMedia)" :key="actor.name" class="cast-card">
                    <div class="cast-avatar">
                      <img v-if="actor.profilePath" :src="actor.profilePath" :alt="actor.name" />
                      <User v-else :size="24" />
                    </div>
                    <div class="cast-info">
                      <div class="actor-name">{{ actor.name }}</div>
                      <div class="actor-char">{{ actor.character }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="eos-modal-actions">
                <button class="eos-btn-primary" @click="playMedia(selectedMedia)"><Play :size="18" /> Reproducir</button>
                <button 
                  class="eos-btn-secondary" 
                  :class="{ 'is-fav': isFavorite(selectedMedia) }"
                  @click="toggleFavorite(selectedMedia)"
                >
                  <Star :size="18" :fill="isFavorite(selectedMedia) ? '#f59e0b' : 'none'" /> 
                  {{ isFavorite(selectedMedia) ? 'En Favoritos' : 'Favoritos' }}
                </button>
                <a v-if="selectedMedia.trailer_url" :href="selectedMedia.trailer_url" target="_blank" class="eos-btn-secondary">
                  <Play :size="18" /> Tráiler
                </a>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Folder Picker Modal -->
      <Transition name="modal-fade">
        <div v-if="showFolderPicker" class="eos-modal-overlay" @click.self="showFolderPicker = false">
          <div class="eos-modal folder-browser-modal">
            <header class="eos-modal-header-simple">
              <h3>Seleccionar Carpeta</h3>
              <button class="eos-modal-close-small" @click="showFolderPicker = false"><X :size="18" /></button>
            </header>
            
            <div class="browser-path-bar">
               <span class="path-label">Ruta actual:</span>
               <span class="path-value">{{ currentBrowserPath }}</span>
            </div>

            <div class="browser-list">
              <div v-if="browsingLoading" class="browser-loading">
                <Loader2 class="spinning" :size="24" />
              </div>
              <template v-else>
                <!-- Parent Directory -->
                <div v-if="!isBrowserRoot && browserParent" 
                     class="browser-item parent" @click="fetchFsDir(browserParent)">
                  <Folder :size="18" />
                  <span>.. (Subir nivel)</span>
                </div>
                <!-- Folders -->
                <div v-for="folder in browserFolders" :key="folder.path" 
                     class="browser-item" @click="selectBrowserFolder(folder.path)">
                  <Folder :size="18" />
                  <span>{{ folder.name }}</span>
                  <ChevronRight :size="14" class="ml-auto" />
                </div>
                <div v-if="browserFolders.length === 0" class="browser-empty">
                  Esta carpeta está vacía o no tiene subcarpetas.
                </div>
              </template>
            </div>

            <footer class="eos-modal-footer">
              <button class="eos-btn-secondary" @click="showFolderPicker = false">Cancelar</button>
              <button class="eos-btn-primary" @click="confirmFolder">Seleccionar esta carpeta</button>
            </footer>
          </div>
        </div>
      </Transition>

      <!-- Advanced Cinema Player Overlay -->
      <Transition name="player-slide">
        <div 
          v-if="showPlayer" 
          class="eos-player-overlay"
          @mousemove="handlePlayerMouseMove"
          :class="{ 'hide-controls': !playerControlsVisible }"
        >
          <!-- Player Top Bar (Visible on Hover) -->
          <header class="player-top-bar">
            <button @click="closePlayer" class="player-back-btn">
              <ChevronLeft :size="24" />
              <div class="player-title-stack">
                 <span class="p-title">{{ playerTitle }}</span>
                 <span class="p-status" v-if="playerMediaId">Reproduciendo ahora en NubeOS</span>
              </div>
            </button>
            <div class="player-top-actions">
              <button @click="togglePiP" class="icon-btn" title="Picture-in-Picture"><MonitorPlay :size="20" /></button>
              <button @click="closePlayer" class="icon-btn" title="Cerrar"><X :size="20" /></button>
            </div>
          </header>
          
          <div class="player-video-wrapper" @click="togglePlay">
            <video 
              ref="videoRef"
              :src="playerSource"
              autoplay
              class="eos-internal-video"
              @timeupdate="handleInternalTimeUpdate"
              @ended="handleInternalEnded"
              @loadedmetadata="onVideoLoaded"
              @progress="updateBuffered"
            >
              <!-- Subtitles tracks will be injected here -->
              <track v-for="sub in availableSubs" :key="sub.label" :src="sub.src" :label="sub.label" :srclang="sub.lang" kind="subtitles">
            </video>

            <!-- Center Play/Pause Indicator (Flashes on action) -->
            <div class="player-center-action" v-if="showActionFeedback">
              <component :is="isPaused ? Play : Pause" :size="64" />
            </div>
          </div>

          <!-- Player Bottom Controls -->
          <div class="player-controls-container">
            <!-- Progress Bar -->
            <div class="player-progress-area" @mousedown="startScrubbing">
              <div class="progress-bg"></div>
              <div class="progress-buffer" :style="{ width: bufferedPercent + '%' }"></div>
              <div class="progress-active" :style="{ width: progressPercent + '%' }"></div>
              <div class="progress-knob" :style="{ left: progressPercent + '%' }"></div>
              <div class="progress-hover-time" :style="{ left: hoverProgressPercent + '%' }"></div>
            </div>

            <div class="player-controls-main">
              <div class="controls-left">
                <button @click="togglePlay" class="main-play-btn">
                  <component :is="isPaused ? Play : Pause" :size="28" fill="currentColor" />
                </button>
                <button @click="skip(-10)" class="skip-btn"><RotateCcw :size="22" /><span>10</span></button>
                <button @click="skip(10)" class="skip-btn"><RotateCcw :size="22" class="rotate-180" /><span>10</span></button>
                
                <div class="volume-control">
                  <button @click="toggleMute">
                    <component :is="isMuted ? VolumeX : Volume2" :size="20" />
                  </button>
                  <input type="range" v-model="playerVolume" min="0" max="1" step="0.1" class="volume-slider" />
                </div>

                <div class="player-time-display">
                  {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                </div>
              </div>

              <div class="controls-right">
                <button v-if="hasNextEpisode" @click="playNextEpisode" class="icon-btn-text">
                  <ArrowRight :size="20" /> Siguiente
                </button>
                <button @click="showQualityMenu = !showQualityMenu" class="icon-btn" :class="{ active: selectedQuality !== 'original' }">
                  <Zap :size="20" />
                </button>
                <button @click="showSubMenu = !showSubMenu" class="icon-btn" :class="{ active: activeSub }">
                  <FileText :size="20" />
                </button>
                <button @click="toggleFullscreen" class="icon-btn">
                  <component :is="isFullscreen ? Minimize : Maximize" :size="20" />
                </button>
              </div>
            </div>
          </div>

          <!-- Quality Menu -->
          <div v-if="showQualityMenu" class="player-sub-menu quality-menu animate-slide-up">
            <h4>Calidad de Video</h4>
            <button v-for="q in ['original', '1080p', '720p', '480p']" 
                    :key="q" 
                    @click="setQuality(q)"
                    :class="{ active: selectedQuality === q }">
              {{ q === 'original' ? 'Calidad Original (Directo)' : q }}
            </button>
          </div>

          <!-- Subtitles Menu -->
          <div v-if="showSubMenu" class="player-sub-menu animate-slide-up">
            <h4>Subtítulos</h4>
            <button @click="setSub(null)" :class="{ active: !activeSub }">Desactivar</button>
            <button 
              v-for="sub in availableSubs" 
              :key="sub.label" 
              @click="setSub(sub)"
              :class="{ active: activeSub?.label === sub.label }"
            >
              {{ sub.label }}
            </button>
          </div>
        </div>
      </Transition>

      <!-- Identify Media Modal (TMDB) - Enhanced -->
      <Transition name="modal-fade">
        <div v-if="showIdentifyModal" class="eos-modal-overlay" @click.self="showIdentifyModal = false">
          <div class="eos-modal identify-modal">
            <header class="eos-modal-header-simple">
              <h3><Search :size="18" /> Identificar Medios</h3>
              <button class="eos-modal-close-small" @click="showIdentifyModal = false"><X :size="18" /></button>
            </header>
            
            <!-- Current file info -->
            <div class="identify-file-info" v-if="identifyingMedia">
              <code>{{ identifyingMedia?.file_path.split('/').pop() }}</code>
              <span class="type-tag">{{ identifyingMedia?.type }}</span>
            </div>

            <div class="identify-body">
              <div class="identify-search-box">
                <Search :size="18" class="text-slate-400" />
                <input 
                  v-model="tmdbSearchQuery" 
                  type="text" 
                  placeholder="Escribe el nombre de la película o serie..."
                  @keyup.enter="searchTmdb"
                />
                <select v-model="tmdbSearchType" class="search-type-select">
                  <option value="all">Todo</option>
                  <option value="movie">Película</option>
                  <option value="series">Serie</option>
                  <option value="music">Música</option>
                </select>
                <button @click="searchTmdb" class="eos-btn-primary mini">Buscar</button>
              </div>

              <div class="identify-results">
                <div v-if="tmdbSearchLoading" class="loading-full"><Loader2 class="spinning" /></div>
                <div v-else-if="tmdbSearchResults.length === 0" class="no-results">
                  <Search :size="32" style="opacity:0.15;margin-bottom:0.5rem" />
                  <p>Busca por título en The Movie Database para vincular metadata.</p>
                </div>
                <div v-else class="tmdb-results-list">
                   <div v-for="res in tmdbSearchResults" :key="'tmdb-'+res.id" class="tmdb-res-card" @click="identifyItem(res.id, res.type)">
                      <img :src="res.poster || '/entertainment/posters/stellar_horizon.png'" class="res-poster" />
                      <div class="res-info">
                        <div class="res-title-row">
                          <span class="res-title">{{ res.title }}</span>
                          <span class="type-tag mini">{{ res.type === 'series' ? 'TV' : 'FILM' }}</span>
                        </div>
                        <div class="res-meta">
                          <span class="res-year">{{ res.year }}</span>
                          <span class="res-rating" v-if="res.rating">⭐ {{ res.rating }}</span>
                        </div>
                        <p class="res-desc">{{ res.description ? res.description.substring(0, 120) + '...' : 'Sin descripción' }}</p>
                      </div>
                      <button class="btn-link-tmdb"><CheckCircle2 :size="14" /> Vincular</button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  Clapperboard, Home, Film, Tv, Music, Search, Bell, User, ChevronDown,
  ChevronLeft, ChevronRight, Play, Pause, Info, Settings2, X, Plus, Star, Loader2, Trash2, Folder, MonitorPlay,
  RotateCcw, ListMusic, FileText, Zap, CheckCircle2, AlertCircle, Download, Disc, Mic2,
  Maximize, Minimize, Volume2, VolumeX, ArrowRight
} from 'lucide-vue-next';
import axios from 'axios';
import { useDesktopStore } from '../stores/desktop';
import { useNotificationStore } from '../stores/notification';
import { useAuthStore } from '../stores/auth';

const desktop = useDesktopStore();
const notification = useNotificationStore();
const auth = useAuthStore();
const token = localStorage.getItem('nubeos_token');

// UI State
const activeNav = ref('home');
const activeAdminTab = ref('overview');
const loading = ref(false);
const scanning = ref(false);
const searchQuery = ref('');
const adminSearch = ref('');
const newLibPath = ref('');
const selectedLibType = ref('movie');
const selectedMedia = ref<any>(null);
const tmdbKey = ref('');
const configData = ref<any>({});
const activeMusicTab = ref('artists');
const selectedSeason = ref<any>(null);
const activeSeriesLevel = ref('series'); // 'series', 'seasons', 'episodes'
const isAdmin = computed(() => auth.isAdmin);

// HLS.js Support
const hls = ref<any>(null);
const isHlsSupported = ref(false);
const loadHlsScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Hls) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.onload = () => resolve(true);
    document.head.appendChild(script);
  });
};

// IPTV State
const iptvLists = ref<any[]>([]);
const selectedIptvList = ref<any>(null);
const selectedIptvCat = ref<any>(null);
const parsedIptvData = ref<any>(null);
const loadingIptv = ref(false);
const newIptvName = ref('');
const newIptvUrl = ref('');

// Admin Detail State
const selectedAdminLibrary = ref<any>(null);
const libraryMedia = ref<any[]>([]);

// Internal Player State
const showPlayer = ref(false);
const playerSource = ref('');
const playerTitle = ref('');
const playerMediaId = ref<number | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const lastSavedTime = ref(0);
const playerControlsVisible = ref(true);
const playerControlsTimer = ref<any>(null);
const isPaused = ref(false);
const isMuted = ref(false);
const playerVolume = ref(1);
const currentTime = ref(0);
const duration = ref(0);
const bufferedPercent = ref(0);
const progressPercent = ref(0);
const hoverProgressPercent = ref(0);
const isFullscreen = ref(false);
const showActionFeedback = ref(false);
const showSubMenu = ref(false);
const showQualityMenu = ref(false);
const selectedQuality = ref('original');
const availableSubs = ref<any[]>([]);
const activeSub = ref<any>(null);
const hasNextEpisode = ref(false);
const activeSeason = ref(1);
const selectedSeries = ref<any>(null);

// Folder Browser State
const showFolderPicker = ref(false);
const currentBrowserPath = ref('');
const browserFolders = ref<any[]>([]);
const browserParent = ref('');
const isBrowserRoot = ref(false);
const browsingLoading = ref(false);

// Identify Modal State
const showIdentifyModal = ref(false);
const identifyingMedia = ref<any>(null);
const tmdbSearchQuery = ref('');
const tmdbSearchResults = ref<any[]>([]);
const tmdbSearchLoading = ref(false);
const tmdbSearchType = ref('all');

// Bulk Operations State
const bulkIdentifying = ref(false);
const bulkWritingNfo = ref(false);

const cacheNonce = ref(Date.now());
const updateCacheNonce = () => cacheNonce.value = Date.now();

// Edit Modal State
const showEditModal = ref(false);
const editingMedia = ref<any>(null);

// Favorites State
const favorites = ref<any[]>([]);

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'movies', label: 'Películas', icon: Film },
  { id: 'series', label: 'Series', icon: Tv },
  { id: 'music', label: 'Música', icon: Music },
  { id: 'iptv', label: 'IPTV', icon: MonitorPlay },
  { id: 'admin', label: 'Dashboard', icon: Settings2 },
];

// Data State
const allMedia = ref<any[]>([]);
const allAdminMedia = ref<any[]>([]);
const libraries = ref<any[]>([]);
const adminStats = ref({ movies: 0, series: 0, music: 0, noPoster: 0, noNfo: 0, identified: 0, lastAdded: [] });

// Computed
const filteredMedia = computed(() => {
  if (!searchQuery.value) return allMedia.value;
  const q = searchQuery.value.toLowerCase();
  return allMedia.value.filter(m => 
    (m.title || '').toLowerCase().includes(q) || 
    (m.series_name || '').toLowerCase().includes(q) ||
    (m.director || '').toLowerCase().includes(q) ||
    (m.studio || '').toLowerCase().includes(q)
  );
});

const seriesMedia = computed(() => {
  const series = filteredMedia.value.filter(m => m.type === 'series' || m.type === 'tv');
  const unique: any[] = [];
  const seen = new Set();
  
  // Sort episodes to find the earliest/latest more easily if needed
  series.forEach(s => {
    const sName = s.series_name || s.title || 'Serie Desconocida';
    if (!seen.has(sName)) {
      seen.add(sName);
      unique.push({ ...s, series_name: sName, title: sName, isSeriesGroup: true });
    }
  });
  
  // Professional Sort: Alphabetical by series name
  return unique.sort((a, b) => a.series_name.localeCompare(b.series_name));
});

const getEpisodes = (name: string) => 
  name ? allMedia.value.filter(m => m.series_name === name).sort((a,b) => (a.season||1) - (b.season||1) || a.episode - b.episode) : [];

const dynamicSections = computed(() => {
  const items = allMedia.value;
  
  // 1. Continue Watching (Progress between 5% and 95%)
  const continueWatching = items.filter(m => {
    if (!m.progress || m.is_finished) return false;
    const duration = (m.runtime || 0) * 60 || 7200; // default 2h if no runtime
    const perc = (m.progress / duration) * 100;
    return perc > 1 && perc < 95;
  }).sort((a, b) => new Date(b.last_watched).getTime() - new Date(a.last_watched).getTime());

  // 2. On Deck (Next episode of series currently being watched)
  const onDeck: any[] = [];
  const inProgressSeriesNames = new Set(
    items.filter(m => (m.type === 'series' || m.type === 'tv') && m.progress > 0)
         .map(m => m.series_name)
  );

  inProgressSeriesNames.forEach(name => {
    const episodes = items.filter(m => m.series_name === name)
                          .sort((a,b) => (a.season||1) - (b.season||1) || a.episode - b.episode);
    
    // Find the first episode not finished
    const nextEp = episodes.find(e => !e.is_finished);
    if (nextEp) onDeck.push(nextEp);
  });

  // 3. Recently Added (By ID descending)
  const recentlyAdded = [...items].sort((a, b) => b.id - a.id).slice(0, 15);

  const sections = [];
  if (continueWatching.length > 0) sections.push({ title: 'Continuar Viendo', items: continueWatching.slice(0, 10) });
  if (onDeck.length > 0) sections.push({ title: 'On Deck', items: onDeck.slice(0, 10) });
  sections.push({ title: 'Agregado Recientemente', items: recentlyAdded });
  
  return sections;
});

const musicTracks = computed(() => 
  filteredMedia.value
    .filter(m => m.type === 'music')
    .map(m => ({
      ...m, 
      artist: m.director || 'Artista Desconocido', 
      album: m.studio || 'Álbum Desconocido',
      genre: m.genre || 'Género Desconocido',
      year: m.year || 'N/A',
      poster: m.poster_path ? (m.poster_path.startsWith('http') ? m.poster_path : `/api/entertainment/poster/${m.id}?token=${token}&v=${cacheNonce.value}`) : null,
      color: `hsl(${(m.id * 137) % 360}, 60%, 40%)`
    }))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
);

const musicArtists = computed(() => {
  const artists: Record<string, any> = {};
  musicTracks.value.forEach(t => {
    if (!artists[t.artist]) {
      artists[t.artist] = { name: t.artist, count: 0, color: t.color, previewTracks: [] };
    }
    artists[t.artist].count++;
    if (artists[t.artist].previewTracks.length < 4) artists[t.artist].previewTracks.push(t);
  });
  return Object.values(artists).sort((a, b) => a.name.localeCompare(b.name));
});

const musicAlbums = computed(() => {
  const albums: Record<string, any> = {};
  musicTracks.value.forEach(t => {
    const key = `${t.artist}-${t.album}`;
    if (!albums[key]) {
      albums[key] = { name: t.album, artist: t.artist, count: 0, color: t.color, year: t.year, poster: t.poster };
    }
    albums[key].count++;
    if (!albums[key].poster && t.poster) albums[key].poster = t.poster;
  });
  return Object.values(albums).sort((a, b) => a.name.localeCompare(b.name));
});

const musicGenres = computed(() => {
  const genres: Record<string, any> = {};
  musicTracks.value.forEach(t => {
    if (!genres[t.genre]) {
      genres[t.genre] = { name: t.genre, count: 0, color: `hsl(${(t.genre.length * 50) % 360}, 50%, 45%)` };
    }
    genres[t.genre].count++;
  });
  return Object.values(genres).sort((a, b) => a.name.localeCompare(b.name));
});

const currentSeasons = computed(() => {
  if (!selectedMedia.value) return [];
  const episodes = getEpisodes(selectedMedia.value.series_name);
  const seasonsMap: Record<number, any> = {};
  episodes.forEach(ep => {
    const s = ep.season || 1;
    if (!seasonsMap[s]) seasonsMap[s] = { number: s, episodes: [] };
    seasonsMap[s].episodes.push(ep);
  });
  return Object.values(seasonsMap).sort((a, b) => a.number - b.number);
});

const getSeasonsCount = (name: string) => {
  const eps = allMedia.value.filter(m => m.series_name === name);
  const seasons = new Set(eps.map(e => e.season || 1));
  return seasons.size;
};

const enterSeries = (item: any) => {
  selectedMedia.value = item;
  activeSeriesLevel.value = 'seasons';
  selectedSeason.value = null;
};

const enterSeason = (season: any) => {
  selectedSeason.value = season;
  activeSeriesLevel.value = 'episodes';
};

const getCast = (media: any) => {
  if (!media || !media.actors) return [];
  try {
    return typeof media.actors === 'string' ? JSON.parse(media.actors) : media.actors;
  } catch (e) { return []; }
};

const groupedMusic = computed(() => {
  const groups: Record<string, Record<string, any[]>> = {};
  musicTracks.value.forEach(track => {
    const artist = track.artist;
    const album = track.album;
    if (!groups[artist]) groups[artist] = {};
    if (!groups[artist][album]) groups[artist][album] = [];
    groups[artist][album].push(track);
  });
  return groups;
});

const filteredAdminMedia = computed(() => {
  if (!adminSearch.value) return allAdminMedia.value;
  const q = adminSearch.value.toLowerCase();
  return allAdminMedia.value.filter(m => (m.title || '').toLowerCase().includes(q));
});

const filteredLibraryMedia = computed(() => {
  if (!adminSearch.value) return libraryMedia.value;
  const q = adminSearch.value.toLowerCase();
  return libraryMedia.value.filter(m => (m.title || '').toLowerCase().includes(q));
});

const unidentifiedMedia = computed(() => {
  return allAdminMedia.value.filter(m => !m.tmdb_id && m.type !== 'music');
});

// Hero Data
const heroIndex = ref(0);
const heroItems = computed(() => {
  // Get up to 5 movies that have a banner
  const featured = allMedia.value
    .filter(m => m.type === 'movie' && m.banner_path)
    .sort((a, b) => b.id - a.id)
    .slice(0, 5)
    .map(m => ({
      ...m,
      banner: `/api/entertainment/banner/${m.id}?token=${token}`,
      duration: '2h 15m' // Placeholder for now
    }));

  // Fallback if no banners identified yet
  if (featured.length === 0) {
    return [
      { title: 'Stellar Horizon', banner: '/entertainment/posters/hero_banner.png', rating: 'PG-13', duration: '2h 46m', genre: 'Sci-Fi', year: '2026', description: 'Una odisea espacial sin precedentes.' },
      { title: 'Shadow Protocol', banner: '/entertainment/posters/hero_banner_2.png', rating: 'R', duration: '2h 10m', genre: 'Thriller', year: '2026', description: 'Intriga global en la era digital.' }
    ];
  }
  return featured;
});

// Methods
const fetchCatalog = async () => {
  loading.value = true;
  try {
    const res = await axios.get('/api/entertainment/catalog');
    allMedia.value = res.data.map((m: any) => ({
      ...m,
      poster: m.poster_path ? `/api/entertainment/poster/${m.id}?token=${token}&v=${cacheNonce.value}` : '/entertainment/posters/stellar_horizon.png'
    }));
  } catch (err) {
    notification.error('Error', 'No se pudo cargar el catálogo');
  } finally {
    loading.value = false;
  }
};

const fetchAdminData = async () => {
  updateCacheNonce();
  try {
    const [stats, media, libs] = await Promise.all([
      axios.get('/api/entertainment/admin/stats'),
      axios.get('/api/entertainment/admin/media'),
      axios.get('/api/entertainment/admin/libraries')
    ]);
    adminStats.value = stats.data;
    allAdminMedia.value = media.data;
    libraries.value = libs.data;
    fetchConfig();
    fetchIptvLists();
  } catch (err) { /* Not admin */ }
};

const fetchIptvLists = async () => {
  try {
    const res = await axios.get('/api/entertainment/iptv/lists');
    iptvLists.value = res.data;
  } catch (err) {}
};

const enterLibraryDetail = async (lib: any) => {
  selectedAdminLibrary.value = lib;
  loading.value = true;
  try {
    const res = await axios.get('/api/entertainment/admin/media', { params: { libPath: lib.path } });
    libraryMedia.value = res.data;
  } catch (err) {
    notification.error('Error', 'No se pudo cargar el contenido');
  } finally {
    loading.value = false;
  }
};

const deleteItem = async (id: number) => {
  if (!confirm('¿Eliminar este contenido?')) return;
  try {
    await axios.delete(`/api/entertainment/admin/media/${id}`);
    libraryMedia.value = libraryMedia.value.filter(m => m.id !== id);
    notification.success('Eliminado', 'Se ha quitado el archivo de la biblioteca.');
  } catch (err) {
    notification.error('Error', 'No se pudo eliminar');
  }
};

const selectIptvList = async (list: any) => {
  selectedIptvList.value = list;
  selectedIptvCat.value = null;
  parsedIptvData.value = null;
  loadingIptv.value = true;
  try {
    const res = await axios.get(`/api/entertainment/iptv/parse/${list.id}`);
    parsedIptvData.value = res.data;
    if (res.data?.categories?.length > 0) {
      selectedIptvCat.value = res.data.categories[0];
    }
  } catch (err) {
    notification.error('Error', 'No se pudo cargar la lista IPTV');
  } finally {
    loadingIptv.value = false;
  }
};

const addIptvList = async () => {
  if (!newIptvName.value || !newIptvUrl.value) return;
  try {
    await axios.post('/api/entertainment/iptv/lists', { name: newIptvName.value, url: newIptvUrl.value });
    newIptvName.value = '';
    newIptvUrl.value = '';
    notification.success('Éxito', 'Lista IPTV añadida');
    fetchIptvLists();
  } catch (err) {
    notification.error('Error', 'No se pudo añadir la lista');
  }
};

const deleteIptvList = async (id: number) => {
  if (!confirm('¿Eliminar esta lista?')) return;
  try {
    await axios.delete(`/api/entertainment/iptv/lists/${id}`);
    fetchIptvLists();
    notification.success('Éxito', 'Lista eliminada');
  } catch (err) {
    notification.error('Error', 'No se pudo eliminar');
  }
};

const playIptv = async (ch: any) => {
  playerSource.value = ch.url;
  playerTitle.value = ch.name;
  playerMediaId.value = null;
  showPlayer.value = true;
  
  await loadHlsScript();
  
  setTimeout(() => {
    if (!videoRef.value) return;
    
    // Destroy previous HLS instance if any
    if (hls.value) {
      hls.value.destroy();
      hls.value = null;
    }

    const isM3u8 = ch.url.includes('.m3u8') || ch.url.includes('m3u8');
    
    if (isM3u8 && (window as any).Hls) {
      if ((window as any).Hls.isSupported()) {
        const hlsInstance = new (window as any).Hls();
        hlsInstance.loadSource(ch.url);
        hlsInstance.attachMedia(videoRef.value);
        hlsInstance.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
          videoRef.value?.play().catch(() => {
            if (videoRef.value) videoRef.value.muted = true;
            videoRef.value?.play();
          });
        });
        hls.value = hlsInstance;
      } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.value.src = ch.url;
        videoRef.value.play();
      }
    } else {
      videoRef.value.src = ch.url;
      videoRef.value.play();
    }
  }, 300);
};

const fetchConfig = async () => {
  try {
    const res = await axios.get('/api/entertainment/admin/config');
    configData.value = res.data;
  } catch (err) {}
};

const saveConfig = async () => {
  if (!tmdbKey.value) return;
  loading.value = true;
  try {
    await axios.post('/api/entertainment/admin/config', { tmdb_api_key: tmdbKey.value });
    notification.success('Éxito', 'Configuración guardada correctamente.');
    tmdbKey.value = '';
    fetchConfig();
  } catch (err) {
    notification.error('Error', 'No se pudo guardar la configuración.');
  } finally {
    loading.value = false;
  }
};

const playMain = (series: any) => {
  if (!series) return;
  const episodes = allMedia.value.filter(m => m.series_name === series.series_name).sort((a,b) => (a.season||1) - (b.season||1) || a.episode - b.episode);
  if (episodes.length > 0) {
    const toPlay = episodes.find(e => e.progress > 0 && !e.is_finished) || episodes[0];
    playMedia(toPlay);
  }
};

const playMedia = async (m: any) => {
  const token = localStorage.getItem('nubeos_token');
  const streamUrl = `/api/entertainment/stream/${m.id}?token=${token}`;
  
  playerSource.value = streamUrl;
  playerTitle.value = m.title;
  playerMediaId.value = m.id;
  showPlayer.value = true;
  isPaused.value = false;
  
  // Reset player states
  availableSubs.value = [];
  activeSub.value = null;
  
  const startTime = m.progress || 0;
  lastSavedTime.value = startTime;
  
  // Check for next episode
  if (m.type === 'series') {
     const eps = getEpisodes(m.series_name);
     const currentIdx = eps.findIndex(e => e.id === m.id);
     hasNextEpisode.value = currentIdx !== -1 && currentIdx < eps.length - 1;
  } else {
     hasNextEpisode.value = false;
  }

  // Fetch subtitles for this media
  try {
     const subRes = await axios.get(`/api/entertainment/media/${m.id}/subtitles`);
     availableSubs.value = subRes.data; // Array of { label, src, lang }
  } catch (err) {}

  await loadHlsScript();

  setTimeout(() => {
    if (!videoRef.value) return;
    
    if (hls.value) {
      hls.value.destroy();
      hls.value = null;
    }

    videoRef.value.src = streamUrl;
    videoRef.value.volume = playerVolume.value;

    videoRef.value.onloadedmetadata = () => {
      if (videoRef.value && startTime > 0) {
        videoRef.value.currentTime = startTime;
        duration.value = videoRef.value.duration;
      }
      videoRef.value?.play();
    };
  }, 300);

  selectedMedia.value = null;
};

const getSeasonNumbers = (seriesName: string) => {
  const eps = getEpisodes(seriesName);
  const seasons = [...new Set(eps.map(e => e.season))].sort((a, b) => a - b);
  return seasons;
};

const getEpisodesBySeason = (seriesName: string, season: number) => {
  return getEpisodes(seriesName).filter(e => e.season === season);
};

const openSeriesView = (s: any) => {
  selectedSeries.value = s;
  const seasons = getSeasonNumbers(s.series_name);
  if (seasons.length > 0) activeSeason.value = seasons[0];
};

// Player Logic Functions
const togglePlay = () => {
  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play();
    isPaused.value = false;
  } else {
    videoRef.value.pause();
    isPaused.value = true;
  }
  flashActionFeedback();
};

const flashActionFeedback = () => {
  showActionFeedback.value = true;
  setTimeout(() => showActionFeedback.value = false, 500);
};

const skip = (seconds: number) => {
  if (!videoRef.value) return;
  videoRef.value.currentTime += seconds;
};

const toggleMute = () => {
  if (!videoRef.value) return;
  videoRef.value.muted = !videoRef.value.muted;
  isMuted.value = videoRef.value.muted;
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen();
    isFullscreen.value = false;
  }
};

const togglePiP = async () => {
  if (!videoRef.value) return;
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await videoRef.value.requestPictureInPicture();
    }
  } catch (e) {}
};

const onVideoLoaded = () => {
  if (videoRef.value) duration.value = videoRef.value.duration;
};

const updateBuffered = () => {
  if (!videoRef.value || !videoRef.value.buffered.length) return;
  const lastBuffer = videoRef.value.buffered.end(videoRef.value.buffered.length - 1);
  bufferedPercent.value = (lastBuffer / duration.value) * 100;
};

const startScrubbing = (e: MouseEvent) => {
  const bar = e.currentTarget as HTMLElement;
  const scrub = (moveEvent: MouseEvent) => {
    const rect = bar.getBoundingClientRect();
    const pos = (moveEvent.clientX - rect.left) / rect.width;
    if (videoRef.value) videoRef.value.currentTime = pos * duration.value;
  };
  scrub(e);
  window.addEventListener('mousemove', scrub);
  window.addEventListener('mouseup', () => window.removeEventListener('mousemove', scrub), { once: true });
};

const setSub = (sub: any) => {
  activeSub.value = sub;
  if (!videoRef.value) return;
  for (let i = 0; i < videoRef.value.textTracks.length; i++) {
    videoRef.value.textTracks[i].mode = (sub && videoRef.value.textTracks[i].label === sub.label) ? 'showing' : 'disabled';
  }
  showSubMenu.value = false;
};

const playNextEpisode = () => {
  if (!playerMediaId.value) return;
  const current = allMedia.value.find(m => m.id === playerMediaId.value);
  if (!current || !current.series_name) return;
  const eps = getEpisodes(current.series_name);
  const currentIdx = eps.findIndex(e => e.id === playerMediaId.value);
  if (currentIdx !== -1 && currentIdx < eps.length - 1) {
     playMedia(eps[currentIdx + 1]);
  }
};

const setQuality = (q: string) => {
  selectedQuality.value = q;
  showQualityMenu.value = false;
  if (!videoRef.value || !playerMediaId.value) return;
  
  const token = localStorage.getItem('nubeos_token');
  const currentTimeSave = videoRef.value.currentTime;
  
  // Update source with quality parameter
  const streamUrl = `/api/entertainment/stream/${playerMediaId.value}?token=${token}&quality=${q}`;
  playerSource.value = streamUrl;
  
  // Reload video
  setTimeout(() => {
    if (!videoRef.value) return;
    videoRef.value.src = streamUrl;
    videoRef.value.onloadedmetadata = () => {
      if (videoRef.value) {
        videoRef.value.currentTime = currentTimeSave;
        videoRef.value.play();
      }
    };
  }, 100);
};

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const handlePlayerMouseMove = () => {
  playerControlsVisible.value = true;
  if (playerControlsTimer.value) clearTimeout(playerControlsTimer.value);
  playerControlsTimer.value = setTimeout(() => {
    if (!isPaused.value) playerControlsVisible.value = false;
  }, 3000);
};

const closePlayer = () => {
  if (hls.value) {
    hls.value.destroy();
    hls.value = null;
  }
  if (videoRef.value) {
    saveInternalProgress();
    videoRef.value.pause();
    videoRef.value.src = "";
  }
  showPlayer.value = false;
};

const saveInternalProgress = async (isFinished = false) => {
  if (!playerMediaId.value || !videoRef.value) return;
  const currentTime = Math.floor(videoRef.value.currentTime);
  if (!isFinished && Math.abs(currentTime - lastSavedTime.value) < 5) return;

  try {
    await axios.post('/api/entertainment/progress', {
      mediaId: playerMediaId.value,
      seconds: currentTime,
      isFinished
    });
    lastSavedTime.value = currentTime;
  } catch (err) {}
};

const handleInternalTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
    progressPercent.value = (currentTime.value / duration.value) * 100;
  }
  saveInternalProgress();
};
const handleInternalEnded = () => saveInternalProgress(true);

const scanLibraries = async () => {
  scanning.value = true;
  try {
    const res = await axios.post('/api/entertainment/admin/scan');
    notification.success('Escaneo listo', `${res.data.newItems} nuevos encontrados.`);
    fetchCatalog();
    fetchAdminData();
  } catch (err) {
    notification.error('Error', 'Fallo al escanear');
  } finally {
    scanning.value = false;
  }
};

const addLibrary = async () => {
  if (!newLibPath.value) return;
  try {
    const name = selectedLibType.value === 'movie' ? 'Películas' : selectedLibType.value === 'series' ? 'Series' : 'Música';
    await axios.post('/api/entertainment/admin/libraries', { 
      path: newLibPath.value, 
      name: name,
      type: selectedLibType.value 
    });
    newLibPath.value = '';
    fetchAdminData();
  } catch (err) { notification.error('Error', 'No se pudo añadir'); }
};

const removeLibrary = async (id: number) => {
  try {
    await axios.delete(`/api/entertainment/admin/libraries/${id}`);
    fetchAdminData();
  } catch (err) { notification.error('Error', 'No se pudo eliminar'); }
};

const deleteMedia = async (id: number) => {
  if (!confirm('¿Eliminar del catálogo?')) return;
  try {
    await axios.delete(`/api/entertainment/admin/media/${id}`);
    fetchAdminData();
    fetchCatalog();
  } catch (err) { notification.error('Error', 'No se pudo eliminar'); }
};

const editMedia = (media: any) => {
  editingMedia.value = { ...media };
  showEditModal.value = true;
};

const saveMediaEdit = async () => {
  if (!editingMedia.value) return;
  loading.value = true;
  try {
    await axios.put(`/api/entertainment/admin/media/${editingMedia.value.id}`, editingMedia.value);
    notification.success('Actualizado', 'La información se ha guardado.');
    updateCacheNonce();
    showEditModal.value = false;
    fetchCatalog();
    fetchAdminData();
    if (selectedAdminLibrary.value) enterLibraryDetail(selectedAdminLibrary.value);
  } catch (err) {
    notification.error('Error', 'No se pudieron guardar los cambios');
  } finally {
    loading.value = false;
  }
};

const isFavorite = (m: any) => {
  if (m.isSeriesGroup) return false;
  return favorites.value.some(f => f.media_id === m.id || (m.url && f.iptv_url === m.url));
};

const toggleFavorite = async (m: any) => {
  const isFav = isFavorite(m);
  try {
    if (isFav) {
      await axios.delete('/api/entertainment/favorites', { data: { media_id: m.id, iptv_url: m.url } });
    } else {
      await axios.post('/api/entertainment/favorites', { mediaId: m.id, iptvUrl: m.url });
    }
    fetchFavorites();
  } catch (err) {}
};

const fetchFavorites = async () => {
  try {
    const res = await axios.get('/api/entertainment/favorites');
    favorites.value = res.data;
  } catch (err) {}
};

const openIdentify = (media: any) => {
  identifyingMedia.value = media;
  tmdbSearchQuery.value = media.series_name || media.title;
  tmdbSearchResults.value = [];
  tmdbSearchType.value = media.type === 'music' ? 'all' : media.type;
  showIdentifyModal.value = true;
};

const searchTmdb = async () => {
  if (!tmdbSearchQuery.value) return;
  tmdbSearchLoading.value = true;
  try {
    const searchType = tmdbSearchType.value === 'all' ? 'all' : tmdbSearchType.value;
    const res = await axios.get('/api/entertainment/admin/tmdb/search', {
      params: { query: tmdbSearchQuery.value, type: searchType }
    });
    tmdbSearchResults.value = res.data;
  } catch (err) {
    notification.error('Error', 'No se pudo buscar en TMDB');
  } finally {
    tmdbSearchLoading.value = false;
  }
};

const identifyItem = async (tmdbId: number, itemType?: string) => {
  if (!identifyingMedia.value) return;
  loading.value = true;
  try {
    const res = await axios.post('/api/entertainment/admin/media/identify', {
      mediaId: identifyingMedia.value.id,
      tmdbId,
      type: itemType || identifyingMedia.value.type
    });
    notification.success('Identificado', 'Metadatos actualizados y NFO generado.');
    updateCacheNonce();
    showIdentifyModal.value = false;
    
    // Refresh lists
    if (selectedAdminLibrary.value) {
      enterLibraryDetail(selectedAdminLibrary.value);
    }
    fetchCatalog();
    fetchAdminData();
  } catch (err) {
    notification.error('Error', 'No se pudo identificar el archivo');
  } finally {
    loading.value = false;
  }
};

const bulkIdentify = async () => {
  bulkIdentifying.value = true;
  try {
    const res = await axios.post('/api/entertainment/admin/media/bulk-identify');
    const { total, identified, failed } = res.data;
    notification.success('Scraping Completo', `${identified} de ${total} identificados. ${failed} fallidos.`);
    updateCacheNonce();
    fetchCatalog();
    fetchAdminData();
  } catch (err) {
    notification.error('Error', 'Fallo en la identificación masiva');
  } finally {
    bulkIdentifying.value = false;
  }
};

const bulkWriteNfo = async () => {
  bulkWritingNfo.value = true;
  try {
    const res = await axios.post('/api/entertainment/admin/nfo/write-bulk');
    const { total, written } = res.data;
    notification.success('NFO Generados', `${written} de ${total} archivos NFO escritos.`);
    fetchAdminData();
  } catch (err) {
    notification.error('Error', 'Fallo al generar archivos NFO');
  } finally {
    bulkWritingNfo.value = false;
  }
};

const writeNfoSingle = async (mediaId: number) => {
  try {
    await axios.post(`/api/entertainment/admin/nfo/write/${mediaId}`);
    notification.success('NFO', 'Archivo NFO generado correctamente.');
    fetchAdminData();
  } catch (err) {
    notification.error('Error', 'No se pudo generar el NFO');
  }
};

const openMediaDetail = (m: any) => {
  if (m.type === 'series' || m.series_name) {
    // Navigate to deep series view instead of modal
    activeNav.value = 'series';
    enterSeries(m);
    return;
  }
  // Fast modal for movies and others
  selectedMedia.value = m;
};

// Folder Browsing
const openFolderPicker = () => {
  showFolderPicker.value = true;
  // If no path defined, let backend decide (it will use NUBEOS_ROOT)
  fetchFsDir(currentBrowserPath.value || '');
};

const fetchFsDir = async (path: string) => {
  browsingLoading.value = true;
  try {
    const res = await axios.get('/api/entertainment/admin/browse-fs', { params: { path } });
    browserFolders.value = res.data.folders;
    currentBrowserPath.value = res.data.currentPath;
    browserParent.value = res.data.parentPath;
    isBrowserRoot.value = res.data.isRoot;
  } catch (err) {
    notification.error('Error', 'No se pudo leer el directorio');
  } finally {
    browsingLoading.value = false;
  }
};

const selectBrowserFolder = (folderPath: string) => {
  fetchFsDir(folderPath);
};

const confirmFolder = () => {
  newLibPath.value = currentBrowserPath.value;
  showFolderPicker.value = false;
};

const getLibIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('peli')) return Film;
  if (n.includes('serie')) return Tv;
  if (n.includes('músic') || n.includes('music')) return Music;
  return Folder;
};

const prevHero = () => heroIndex.value = (heroIndex.value - 1 + heroItems.value.length) % heroItems.value.length;
const nextHero = () => heroIndex.value = (heroIndex.value + 1) % heroItems.value.length;

const featuredBanners = computed(() => {
  return heroItems.value.map(item => ({
    ...item,
    bannerUrl: item.banner.includes('v=') ? item.banner : `${item.banner}&v=${cacheNonce.value}`
  }));
});

// Lifecycle
let heroTimer: any;
onMounted(() => {
  fetchCatalog();
  fetchIptvLists();
  fetchFavorites();
  if (activeNav.value === 'admin') fetchAdminData();
  heroTimer = setInterval(nextHero, 8000);
});
onUnmounted(() => clearInterval(heroTimer));

watch(activeNav, (val) => {
  if (val === 'admin') fetchAdminData();
});
</script>

<style scoped>
.eos-container { display: flex; width: 100%; height: 100%; background: #0b1120; color: #e2e8f0; font-family: 'Inter', sans-serif; overflow: hidden; }
.eos-sidebar { width: 70px; background: rgba(8, 15, 30, 0.95); border-right: 1px solid rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; align-items: center; padding: 1rem 0; z-index: 10; }
.eos-sidebar-logo { color: #f59e0b; margin-bottom: 2rem; display: flex; flex-direction: column; align-items: center; font-size: 0.5rem; gap: 4px; }
.eos-nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0.75rem 0.5rem; color: #64748b; background: none; border: none; cursor: pointer; font-size: 0.6rem; transition: all 0.2s; width: 60px; }
.eos-nav-item.active { color: #f59e0b; background: rgba(245, 158, 11, 0.1); border-radius: 12px; }
.eos-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.eos-topbar { height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; background: rgba(11, 17, 32, 0.8); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.eos-search-box { display: flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 0.5rem 1rem; width: 300px; }
.eos-search-box input { background: none; border: none; color: white; outline: none; font-size: 0.85rem; width: 100%; }
.eos-user-pill { display: flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.05); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; }
.eos-content { flex: 1; overflow-y: auto; padding-bottom: 3rem; position: relative; }
.eos-loading-screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0b1120; z-index: 20; color: #64748b; gap: 1rem; }
.eos-hero { position: relative; height: 400px; overflow: hidden; }
.eos-hero-slider { display: flex; height: 100%; transition: transform 0.6s ease; }
.eos-hero-slide { min-width: 100%; background-size: cover; background-position: center 25%; position: relative; display: flex; align-items: flex-end; padding: 3rem; }
.eos-hero-overlay { position: absolute; inset: 0; background: linear-gradient(0deg, #0b1120 0%, transparent 100%); }
.eos-hero-content { position: relative; z-index: 2; max-width: 500px; }
.eos-hero-title { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; }
.eos-hero-meta { display: flex; gap: 1rem; font-size: 0.8rem; color: #94a3b8; margin-bottom: 1rem; }
.eos-rating-badge { background: #f59e0b; color: #0b1120; padding: 2px 6px; border-radius: 4px; font-weight: 800; }
.eos-hero-arrow { 
  position: absolute; top: 50%; transform: translateY(-50%); 
  width: 54px; height: 54px; border-radius: 50%; 
  background: rgba(15, 23, 42, 0.4); 
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 5; transition: all 0.3s; 
}
.eos-hero-arrow:hover { 
  background: #f59e0b; border-color: #f59e0b; color: #000;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
  transform: translateY(-50%) scale(1.1);
}
.eos-hero-arrow.left { left: 2rem; }
.eos-hero-arrow.right { right: 2rem; }
.eos-media-section { padding: 2rem 2rem 0; }
.eos-media-row { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; }
.eos-media-card { min-width: 160px; max-width: 160px; transition: transform 0.3s; cursor: pointer; }
.eos-media-card:hover { transform: scale(1.05); }
.eos-card-poster { position: relative; aspect-ratio: 2/3; border-radius: 12px; overflow: hidden; background: #1e293b; }
.eos-card-poster img { width: 100%; height: 100%; object-fit: cover; }
.eos-card-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
.eos-media-card:hover .eos-card-overlay { opacity: 1; }
.eos-new-badge { position: absolute; top: 8px; right: 8px; background: #22c55e; color: white; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 800; }
.eos-card-info { margin-top: 0.5rem; font-size: 0.85rem; }
.eos-card-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eos-card-meta { color: #64748b; font-size: 0.75rem; }
.eos-grid-section { padding: 2rem; }
.eos-music-container { padding: 0 1rem; }
.eos-music-app { display: flex; flex-direction: column; height: 100%; padding: 1.5rem 2rem; }
.music-header { margin-bottom: 2rem; }
.music-tabs { display: flex; gap: 0.5rem; background: rgba(255,255,255,0.03); padding: 0.4rem; border-radius: 12px; width: fit-content; }
.music-tabs button { display: flex; align-items: center; gap: 8px; padding: 0.6rem 1.25rem; background: none; border: none; color: #94a3b8; font-size: 0.85rem; font-weight: 600; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
.music-tabs button:hover { color: white; background: rgba(255,255,255,0.05); }
.music-tabs button.active { background: #f59e0b; color: #1e293b; }

.music-grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1.5rem; }
.music-item-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 1.25rem; text-align: center; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
.music-item-card:hover { background: rgba(255,255,255,0.05); transform: translateY(-5px); border-color: rgba(245, 158, 11, 0.3); }

.artist-avatar { width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 1.25rem; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 8px 16px rgba(0,0,0,0.3); overflow: hidden; }
.album-cover { aspect-ratio: 1; border-radius: 12px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 10px 20px rgba(0,0,0,0.4); overflow: hidden; }
.album-img { width: 100%; height: 100%; object-fit: cover; }
.genre-box { aspect-ratio: 16/9; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.3); margin-bottom: 0.75rem; text-transform: uppercase; }

/* Series Hierarchy Styles */
.series-nav-header { margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
.breadcrumb { display: flex; align-items: center; gap: 0.75rem; font-size: 1.1rem; }
.breadcrumb span { cursor: pointer; color: #94a3b8; transition: color 0.2s; }
.breadcrumb span:hover { color: white; }
.breadcrumb span.active { color: #f59e0b; font-weight: 700; cursor: default; }
.breadcrumb .separator { color: #334155; cursor: default; }

.season-badge { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; backdrop-filter: blur(4px); }
.season-fallback { font-size: 3rem; font-weight: 900; opacity: 0.3; }

.episodes-detailed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; }
.episode-card { cursor: pointer; transition: transform 0.3s; }
.episode-card:hover { transform: translateY(-5px); }
.episode-thumb-container { position: relative; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; margin-bottom: 0.75rem; background: #1e293b; border: 1px solid rgba(255,255,255,0.05); }
.episode-thumb { width:100%; height:100%; object-fit: cover; }
.episode-play-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; color: white; }
.episode-card:hover .episode-play-overlay { opacity: 1; }
.episode-progress { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(255,255,255,0.1); }
.progress-fill { height: 100%; background: #f59e0b; }

.episode-info { padding: 0 0.5rem; }
.ep-num { font-size: 0.75rem; color: #f59e0b; font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem; }
.ep-title { font-size: 1rem; color: white; font-weight: 600; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ep-meta { font-size: 0.8rem; color: #64748b; }

/* Plex Style Series Detail */
.series-hero-banner { display: flex; gap: 3rem; margin-bottom: 4rem; margin-top: 1rem; }
.hero-poster { width: 260px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); object-fit: cover; }
.hero-right { flex: 1; padding-top: 1rem; }
.hero-title { font-size: 3rem; font-weight: 900; color: white; margin-bottom: 1rem; line-height: 1.1; }
.hero-meta { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
.year-badge, .type-badge { background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 700; color: #cbd5e1; }
.rating { color: #f59e0b; font-weight: 700; font-size: 1.1rem; }
.hero-actions { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2.5rem; }
.play-main-btn { background: #f59e0b; color: black; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-weight: 800; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; gap: 0.6rem; transition: transform 0.2s; }
.play-main-btn:hover { transform: scale(1.05); background: #fbbf24; }
.icon-action-btn { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.icon-action-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }
.icon-action-btn.active { color: #f59e0b; border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.hero-desc { font-size: 1.1rem; line-height: 1.7; color: #cbd5e1; margin-bottom: 2.5rem; max-width: 900px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.hero-extra { display: flex; flex-direction: column; gap: 1rem; }
.ex-item { display: flex; gap: 1.5rem; font-size: 0.85rem; }
.ex-label { color: #64748b; font-weight: 800; min-width: 80px; letter-spacing: 0.05em; }
.ex-val { color: #94a3b8; font-weight: 500; }

.section-title-small { font-size: 1.25rem; font-weight: 800; color: white; margin-bottom: 1.5rem; }
.seasons-horizontal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1.5rem; }
.season-mini-card { cursor: pointer; transition: transform 0.3s; }
.season-mini-card:hover { transform: scale(1.05); }
.season-mini-poster { position: relative; aspect-ratio: 2/3; border-radius: 8px; overflow: hidden; margin-bottom: 0.75rem; background: #1e293b; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
.season-mini-poster img { width: 100%; height: 100%; object-fit: cover; }
.season-ep-count-badge { position: absolute; top: 8px; right: 8px; background: rgba(245, 158, 11, 0.9); color: black; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 900; }
.season-mini-name { font-size: 0.9rem; font-weight: 700; color: white; margin-bottom: 2px; }
.season-mini-ep-text { font-size: 0.75rem; color: #64748b; font-weight: 500; }

.item-name { font-weight: 700; font-size: 0.95rem; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-artist { font-size: 0.75rem; color: #f59e0b; margin-top: 2px; }
.item-meta { font-size: 0.7rem; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

.music-table-view { background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
.song-table { width: 100%; border-collapse: collapse; text-align: left; }
.song-table th { padding: 1rem; font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.song-table td { padding: 0.9rem 1rem; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.02); }
.song-table tr:hover { background: rgba(255,255,255,0.03); }
.song-cell { display: flex; align-items: center; gap: 0.75rem; }
.song-play-inline { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: none; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: all 0.2s; }
.song-table tr:hover .song-play-inline { opacity: 1; }
.song-play-inline:hover { transform: scale(1.1); background: #f59e0b; color: #1e293b; }

.music-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #64748b; text-align: center; }
.music-empty-state h3 { color: white; margin-top: 1rem; margin-bottom: 0.5rem; }

.text-amber-500 { color: #f59e0b; }
.opacity-80 { opacity: 0.8; }
.text-center { text-align: center; }

.eos-music-artist-section { margin-bottom: 3rem; }

/* Admin View Styles */
.eos-admin-container { padding: 2rem; }
.admin-tabs { display: flex; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 2rem; }
.admin-tabs button { padding: 0.5rem 1rem; background: none; border: none; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 6px; }
.admin-tabs button.active { color: #f59e0b; border-bottom-color: #f59e0b; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.stat-card { background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.5rem; transition: transform 0.2s; }
.stat-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.05); }
.stat-val { font-size: 1.5rem; font-weight: 800; color: white; }
.stat-label { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.eos-scroll-table { overflow-x: auto; margin-top: 1rem; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.8rem; }
.type-badge { background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; }
.table-btns { display: flex; gap: 4px; } .table-btns button { padding: 4px; border: none; border-radius: 4px; cursor: pointer; }
.eos-modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 100; }
.eos-modal { width: 90%; max-width: 600px; background: #111827; border-radius: 20px; overflow: hidden; position: relative; }
.eos-modal-banner { height: 250px; background-size: cover; display: flex; align-items: flex-end; padding: 2rem; position: relative; }
.eos-modal-body { padding: 2rem; } .eos-modal-desc { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
.eos-modal-tagline { color: #f59e0b; font-style: italic; font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9; }
.eos-modal-meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid rgba(255,255,255,0.04); }
.meta-item { display: flex; flex-direction: column; gap: 2px; }
.meta-label { font-size: 0.65rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.meta-value { font-size: 0.8rem; color: #e2e8f0; }
.cert-badge { background: rgba(245,158,11,0.15); color: #f59e0b; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; width: fit-content; }
.admin-tabs button { display: flex; align-items: center; gap: 6px; }
.eos-episodes-list { display: flex; flex-direction: column; gap: 8px; margin-top: 1rem; }
.eos-episode-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 10px; cursor: pointer; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.mt-4 { margin-top: 1rem; }
.ml-auto { margin-left: auto; }

/* Folder Browser Modal */
.folder-browser-modal { max-width: 500px; height: 80vh; display: flex; flex-direction: column; }
.eos-modal-header-simple { padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
.eos-modal-header-simple h3 { font-size: 1rem; color: white; margin: 0; }
.eos-modal-close-small { background: none; border: none; color: #64748b; cursor: pointer; }
.browser-path-bar { padding: 0.75rem 1.5rem; background: rgba(0,0,0,0.2); font-size: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.03); display: flex; gap: 0.5rem; align-items: center; }
.path-label { color: #64748b; }
.path-value { color: #f59e0b; word-break: break-all; font-family: monospace; }
.browser-list { flex: 1; overflow-y: auto; padding: 0.5rem; display: flex; flex-direction: column; gap: 2px; }
.browser-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; color: #cbd5e1; font-size: 0.85rem; }
.browser-item:hover { background: rgba(255,255,255,0.05); color: white; }
.browser-item.parent { color: #94a3b8; font-style: italic; }
.browser-loading, .browser-empty { display: flex; align-items: center; justify-content: center; height: 100px; color: #64748b; font-size: 0.85rem; }
.eos-modal-footer { padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; gap: 1rem; }
.eos-btn-info { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: none; padding: 0.5rem; border-radius: 8px; cursor: pointer; }
.eos-btn-info:hover { background: #3b82f6; color: white; }

/* Libraries Redesign */
.admin-setup-banner { background: linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4)); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
.banner-content h3 { font-size: 1.25rem; color: white; margin-bottom: 0.5rem; }
.banner-content p { color: #94a3b8; font-size: 0.9rem; }
.lib-add-form-premium { display: flex; gap: 1rem; align-items: center; max-width: 600px; }
.lib-add-form-premium .input-group { flex: 1; display: flex; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
.lib-type-select { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0.75rem; color: white; cursor: pointer; outline: none; }
.lib-add-form-premium input { flex: 1; background: transparent; border: none; padding: 0.75rem 1rem; color: white; font-size: 0.9rem; }
.browse-btn { background: rgba(255,255,255,0.05); border: none; border-left: 1px solid rgba(255,255,255,0.1); color: #94a3b8; padding: 0 1rem; cursor: pointer; transition: all 0.2s; }
.browse-btn:hover { color: white; background: rgba(255,255,255,0.1); }

/* Library Detail View Styles */
.detail-header { margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem; }
.eos-hero-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
.eos-btn-primary { 
  display: flex; align-items: center; gap: 8px; padding: 0.8rem 1.8rem; 
  background: linear-gradient(135deg, #f59e0b, #d97706); 
  color: white; border: none; border-radius: 12px; cursor: pointer; 
  font-weight: 700; font-size: 0.95rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
}
.eos-btn-primary:hover { 
  transform: translateY(-2px) scale(1.02); 
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4); 
  filter: brightness(1.1);
}
.eos-btn-primary:active { transform: translateY(0) scale(0.98); }

.eos-btn-secondary { 
  display: flex; align-items: center; gap: 8px; padding: 0.8rem 1.8rem; 
  background: rgba(255, 255, 255, 0.1); 
  backdrop-filter: blur(10px);
  color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; cursor: pointer; 
  font-weight: 600; font-size: 0.95rem; transition: all 0.3s;
}
.eos-btn-secondary:hover { 
  background: rgba(255, 255, 255, 0.2); 
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}
.eos-btn-secondary:active { transform: translateY(0); }
.back-link { background: none; border: none; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 0.9rem; width: fit-content; padding: 0; }
.back-link:hover { color: white; }
.header-main { display: flex; justify-content: space-between; align-items: center; }
.lib-info-pill { display: flex; align-items: center; gap: 1rem; }
.lib-info-pill h2 { margin: 0; font-size: 1.5rem; color: white; }
.header-actions { display: flex; gap: 1rem; }
.btn-del-main { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.btn-del-main:hover { background: #f43f5e; color: white; }

.table-container { background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; overflow: hidden; }
.table-header { padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
.table-header h3 { margin: 0; font-size: 1rem; color: #94a3b8; }
.mini-search { display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.8rem; }
.mini-search input { background: none; border: none; color: white; outline: none; }

.td-poster { width: 50px; }
.mini-poster { width: 40px; aspect-ratio: 2/3; border-radius: 4px; background-size: cover; background-position: center; border: 1px solid rgba(255,255,255,0.1); }
.media-title-stack { display: flex; flex-direction: column; gap: 2px; }
.m-title { font-weight: 600; color: white; }
.m-year { font-size: 0.75rem; color: #64748b; }
.m-rating { font-size: 0.75rem; color: #f59e0b; margin-top: 2px; }
.type-tag { font-size: 0.65rem; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; text-transform: uppercase; color: #94a3b8; }
.file-path-code { font-size: 0.7rem; color: #64748b; font-family: monospace; }

.lib-card.selectable { cursor: pointer; }
.lib-card.selectable:hover .lib-card-icon { transform: scale(1.1); }

/* IPTV Styles */
.eos-iptv-container { display: flex; height: 100%; }
.iptv-side { width: 260px; background: rgba(0,0,0,0.2); border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; }
.iptv-side-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
.iptv-side-header h3 { font-size: 0.9rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
.iptv-list-selector, .iptv-cat-selector { flex: 1; overflow-y: auto; padding: 0 0.75rem; }
.iptv-list-item, .iptv-cat-item { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border: none; background: none; color: #94a3b8; cursor: pointer; border-radius: 8px; font-size: 0.85rem; text-align: left; transition: all 0.2s; }
.iptv-list-item:hover, .iptv-cat-item:hover { background: rgba(255,255,255,0.05); color: white; }
.iptv-list-item.active, .iptv-cat-item.active { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.cat-count { margin-left: auto; font-size: 0.7rem; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; }
.iptv-main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: rgba(0,0,0,0.1); }
.iptv-loading { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; gap: 1rem; }
.iptv-channels-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1.5rem; padding: 2rem; }
.iptv-channel-card { cursor: pointer; transition: transform 0.2s; }
.iptv-channel-card:hover { transform: translateY(-5px); }
.ch-logo { aspect-ratio: 16/9; background: #1e293b; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.05); }
.ch-logo img { width: 100%; height: 100%; object-fit: contain; padding: 10px; }
.ch-play-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
.iptv-channel-card:hover .ch-play-overlay { opacity: 1; }
.ch-info { margin-top: 0.75rem; text-align: center; }
.ch-name { font-size: 0.8rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.iptv-welcome { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; gap: 1rem; text-align: center; padding: 2rem; }
.iptv-welcome h2 { color: white; }
.iptv-add-btn { background: rgba(255,255,255,0.05); border: none; color: #64748b; padding: 4px; border-radius: 4px; cursor: pointer; }
.iptv-add-btn:hover { color: white; background: rgba(255,255,255,0.1); }

/* Config Styles */
.config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; }
.config-card { background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 1.5rem; }
.config-card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.config-card-header h3 { font-size: 1.1rem; color: white; margin: 0; }
.input-with-action { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.input-with-action input { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.6rem 1rem; color: white; outline: none; }
.eos-field label { font-size: 0.8rem; color: #94a3b8; font-weight: 500; }
.text-indigo-400 { color: #818cf8; }
.text-slate-400 { color: #94a3b8; }
.text-xs { font-size: 0.75rem; }
.animate-fade { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.lib-grid-container { display: flex; flex-direction: column; gap: 1.5rem; }
.section-header { display: flex; justify-content: space-between; align-items: center; }
.section-header h3 { color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
.scan-action-btn { display: flex; align-items: center; gap: 0.5rem; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.scan-action-btn:hover:not(:disabled) { background: #f59e0b; color: #1e293b; }
.scan-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Internal Player Styles */
.eos-player-overlay { position: absolute; inset: 0; background: #000; z-index: 200; display: flex; flex-direction: column; }
.player-top-bar { height: 70px; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); padding: 0 2rem; display: flex; align-items: center; gap: 2rem; position: absolute; top: 0; left: 0; right: 0; z-index: 210; opacity: 0; transition: opacity 0.3s; }
.eos-player-overlay:hover .player-top-bar { opacity: 1; }
.player-back-btn { background: none; border: none; color: white; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 1rem; }
.player-current-title { color: #94a3b8; font-size: 0.9rem; font-weight: 500; }
.player-video-wrapper { flex: 1; display: flex; align-items: center; justify-content: center; }
.eos-internal-video { width: 100%; height: 100%; }

.player-slide-enter-active, .player-slide-leave-active { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.player-slide-enter-from { opacity: 0; transform: scale(1.1); }
.player-slide-leave-to { opacity: 0; transform: scale(0.9); }

.lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.lib-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1.25rem; transition: all 0.3s; position: relative; overflow: hidden; }
.lib-card:hover { border-color: rgba(99, 102, 241, 0.3); background: rgba(255,255,255,0.04); transform: translateY(-2px); }
.lib-card-icon { width: 56px; height: 56px; border-radius: 10px; background: rgba(99, 102, 241, 0.1); color: #818cf8; display: flex; align-items: center; justify-content: center; }
.lib-card-body { flex: 1; overflow: hidden; }
.lib-card-body h4 { color: white; margin-bottom: 0.25rem; font-size: 1rem; }
.lib-card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem; }
.lib-type-tag { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; text-transform: uppercase; font-weight: 700; }
.lib-card-body code { color: #64748b; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.lib-card-actions { opacity: 0; transition: opacity 0.2s; }
.lib-card:hover .lib-card-actions { opacity: 1; }
.item-action-btn { background: none; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.item-action-btn.delete { color: #f43f5e; }
.item-action-btn.delete:hover { background: rgba(244, 63, 94, 0.1); }
.lib-empty-state { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; background: rgba(255,255,255,0.01); border: 2px dashed rgba(255,255,255,0.05); border-radius: 16px; color: #64748b; gap: 1rem; }

.spinning { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Identify Modal Styles */
.identify-modal { max-width: 700px; height: 80vh; display: flex; flex-direction: column; }
.identify-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 1.5rem; gap: 1.5rem; }
.identify-search-box { display: flex; align-items: center; gap: 1rem; background: rgba(0,0,0,0.3); padding: 0.5rem 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
.identify-search-box input { flex: 1; background: none; border: none; color: white; outline: none; font-size: 1rem; }
.identify-results { flex: 1; overflow-y: auto; }
.tmdb-results-list { display: flex; flex-direction: column; gap: 1rem; }
.tmdb-res-card { display: flex; gap: 1rem; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; align-items: center; }
.tmdb-res-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(245, 158, 11, 0.3); }
.res-poster { width: 60px; aspect-ratio: 2/3; border-radius: 6px; object-fit: cover; }
.res-info { flex: 1; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.res-title { font-weight: 600; color: white; }
.res-year { font-size: 0.8rem; color: #64748b; }
.res-desc { font-size: 0.75rem; color: #94a3b8; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.eos-btn-primary.mini { padding: 0.4rem 1rem; font-size: 0.8rem; }
.loading-full { display: flex; align-items: center; justify-content: center; height: 100%; color: #f59e0b; }
.no-results { color: #64748b; text-align: center; padding: 2rem; font-size: 0.9rem; }
.no-results code { display: block; margin-top: 1rem; color: #94a3b8; font-family: monospace; }

/* Edit Media Styles */
.edit-media-modal { max-width: 600px; }
.edit-media-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.edit-field { display: flex; flex-direction: column; gap: 4px; }
.edit-field label { font-size: 0.8rem; color: #94a3b8; font-weight: 500; }
.edit-field input, .edit-field textarea { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.6rem; color: white; outline: none; }
.edit-field input:focus, .edit-field textarea:focus { border-color: #f59e0b; }
.edit-row { display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; }
.is-fav { color: #f59e0b !important; border-color: rgba(245, 158, 11, 0.3) !important; background: rgba(245, 158, 11, 0.05) !important; }

/* ====== Scraper & NFO Styles ====== */

/* Stat card variants */
.stat-card.success { border-left: 3px solid #22c55e; }
.stat-card.success svg { color: #22c55e; }
.stat-card.warning { border-left: 3px solid #f59e0b; }
.stat-card.warning svg { color: #f59e0b; }
.stat-card.info { border-left: 3px solid #3b82f6; }
.stat-card.info svg { color: #3b82f6; }

/* Scraper Hero */
.scraper-hero { 
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(245, 158, 11, 0.08)); 
  border: 1px solid rgba(99, 102, 241, 0.15); 
  border-radius: 16px; 
  padding: 2rem; 
  margin-bottom: 2rem; 
}
.scraper-hero-content h2 { 
  font-size: 1.35rem; color: white; margin-bottom: 0.5rem; 
  display: flex; align-items: center; gap: 0.75rem; 
}
.scraper-hero-content p { color: #94a3b8; font-size: 0.9rem; line-height: 1.6; max-width: 700px; }

/* Scraper Action Cards Grid */
.scraper-actions-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
  gap: 1.25rem; 
  margin-bottom: 2rem; 
}
.scraper-action-card { 
  background: rgba(255,255,255,0.02); 
  border: 1px solid rgba(255,255,255,0.06); 
  border-radius: 14px; 
  padding: 1.5rem; 
  display: flex; 
  flex-direction: column;
  gap: 1.25rem;
  transition: all 0.3s; 
}
.scraper-action-card:hover { 
  border-color: rgba(255,255,255,0.12); 
  background: rgba(255,255,255,0.04); 
  transform: translateY(-2px); 
}
.sac-icon { 
  width: 52px; height: 52px; border-radius: 12px; 
  display: flex; align-items: center; justify-content: center; 
}
.sac-icon.tmdb { background: rgba(1, 180, 228, 0.12); color: #01b4e4; }
.sac-icon.nfo { background: rgba(168, 85, 247, 0.12); color: #a855f7; }
.sac-icon.scan { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
.sac-body h3 { font-size: 1rem; color: white; margin-bottom: 0.35rem; }
.sac-body p { font-size: 0.8rem; color: #94a3b8; line-height: 1.5; }
.sac-stat { margin-top: 0.75rem; font-size: 0.8rem; color: #64748b; }
.sac-stat-num { 
  font-weight: 800; font-size: 1.1rem; color: #f59e0b; margin-right: 4px; 
}

/* Status Badges */
.status-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.status-badge { 
  display: inline-flex; align-items: center; gap: 4px; 
  font-size: 0.65rem; font-weight: 600; 
  padding: 3px 8px; border-radius: 6px; 
  text-transform: uppercase; letter-spacing: 0.02em;
  white-space: nowrap;
}
.status-badge.ok { background: rgba(34, 197, 94, 0.12); color: #22c55e; }
.status-badge.danger { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
.status-badge.muted { background: rgba(100, 116, 139, 0.1); color: #475569; }

/* Media row extras */
.m-extra { font-size: 0.7rem; color: #64748b; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }

/* BTN NFO */
.btn-nfo { background: rgba(168, 85, 247, 0.1); color: #a855f7; border: none; padding: 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.btn-nfo:hover { background: #a855f7; color: white; }
.btn-edit { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: none; padding: 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.btn-edit:hover { background: #3b82f6; color: white; }
.btn-del { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: none; padding: 4px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.btn-del:hover { background: #f43f5e; color: white; }

/* Identify Modal Enhancements */
.identify-file-info { 
  padding: 0.75rem 1.5rem; 
  background: rgba(0,0,0,0.3); 
  border-bottom: 1px solid rgba(255,255,255,0.05); 
  display: flex; align-items: center; gap: 0.75rem; 
  font-size: 0.8rem; 
}
.identify-file-info code { color: #f59e0b; font-family: monospace; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.search-type-select { 
  background: rgba(0,0,0,0.5); 
  border: 1px solid rgba(255,255,255,0.15); 
  border-radius: 8px; 
  padding: 0.4rem 0.5rem; 
  color: white; 
  font-size: 0.8rem; 
  cursor: pointer; 
  outline: none; 
}

.res-title-row { display: flex; align-items: center; gap: 0.5rem; }
.type-tag.mini { font-size: 0.55rem; padding: 1px 5px; }
.res-meta { display: flex; gap: 0.75rem; align-items: center; }
.res-rating { font-size: 0.75rem; color: #f59e0b; }
.btn-link-tmdb { 
  background: rgba(245, 158, 11, 0.1); color: #f59e0b; 
  border: 1px solid rgba(245, 158, 11, 0.2); 
  padding: 0.4rem 0.8rem; border-radius: 6px; 
  font-size: 0.75rem; font-weight: 600; 
  display: flex; align-items: center; gap: 4px; 
  white-space: nowrap; min-width: fit-content;
}
.btn-link-tmdb:hover { background: #f59e0b; color: #1e293b; }

.mt-6 { margin-top: 1.5rem; }
.py-8 { padding: 2rem 0; }
.eos-modal-banner {
  position: relative;
  height: 350px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
}

.eos-modal-banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.4) 50%, rgba(15, 23, 42, 0.1) 100%);
}

.eos-modal-banner-content {
  position: relative;
  z-index: 2;
  padding: 30px;
  width: 100%;
}

.eos-modal-banner-content h2 {
  font-size: 2.5rem;
  font-weight: 800;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

/* Cast Section Styles */
.eos-modal-cast {
  margin-top: 40px;
}

.eos-modal-cast h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #e2e8f0;
}

.cast-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-width: thin;
}

.cast-card {
  flex: 0 0 100px;
  text-align: center;
}

.cast-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 10px;
  background: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cast-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.actor-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.2;
}

.hero-overlay-cinematic {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(15, 23, 42, 1) 0%, rgba(15, 23, 42, 0.8) 40%, rgba(15, 23, 42, 0.4) 100%);
  z-index: 1;
}

.series-hero-banner {
  position: relative;
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  overflow: hidden;
}

.hero-left, .hero-right {
  position: relative;
  z-index: 2;
}

.hero-poster {
  border-radius: 8px;
  max-width: 200px;
}

.card-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  z-index: 10;
}

.progress-fill {
  height: 100%;
  background: #ef4444; /* Netflix/Plex Red */
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  transition: width 0.3s ease;
}

.eos-media-card.is-episode .eos-card-poster {
  aspect-ratio: 16/9;
}

.eos-media-card.is-episode .eos-card-poster img {
  object-fit: cover;
}

/* --- ADVANCED CINEMA PLAYER STYLES --- */
.eos-player-overlay {
  position: fixed;
  inset: 0;
  background: black;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  color: white;
  overflow: hidden;
  cursor: default;
}

.eos-player-overlay.hide-controls {
  cursor: none;
}

.player-video-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: black;
}

.eos-internal-video {
  width: 100%;
  height: 100%;
  max-height: 100vh;
}

/* Hide native controls as we use our own */
video::-webkit-media-controls {
  display: none !important;
}

/* Custom Controls Layout */
.player-top-bar,
.player-controls-container {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 20px 40px;
  transition: opacity 0.4s ease, transform 0.4s ease;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
}

.player-controls-container {
  bottom: 0;
  top: auto;
  padding-bottom: 40px;
  background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
}

.eos-player-overlay.hide-controls .player-top-bar {
  opacity: 0;
  transform: translateY(-20px);
}

.eos-player-overlay.hide-controls .player-controls-container {
  opacity: 0;
  transform: translateY(20px);
}

/* Top Bar */
.player-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.player-back-btn {
  display: flex;
  align-items: center;
  gap: 15px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
}

.player-back-btn:hover {
  transform: translateX(-5px);
}

.player-title-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.p-title {
  font-size: 1.2rem;
  font-weight: 700;
}

.p-status {
  font-size: 0.8rem;
  opacity: 0.6;
}

/* Progress Area */
.player-progress-area {
  position: relative;
  height: 6px;
  margin-bottom: 25px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.player-progress-area:hover {
  height: 10px;
}

.progress-bg {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.2);
  border-radius: 5px;
}

.progress-buffer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: rgba(255,255,255,0.2);
  border-radius: 5px;
  transition: width 0.3s;
}

.progress-active {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: #ef4444;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
}

.progress-knob {
  position: absolute;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
  display: none;
}

.player-progress-area:hover .progress-knob {
  display: block;
}

/* Main Controls */
.player-controls-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.controls-left, .controls-right {
  display: flex;
  align-items: center;
  gap: 25px;
}

.main-play-btn {
  background: white;
  color: black;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.main-play-btn:hover {
  transform: scale(1.1);
}

.skip-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.skip-btn:hover {
  opacity: 1;
}

.skip-btn span {
  margin-top: -12px;
}

.rotate-180 {
  transform: rotateY(180deg);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.volume-slider {
  width: 80px;
  accent-color: white;
}

.player-time-display {
  font-family: monospace;
  font-size: 0.95rem;
  opacity: 0.8;
}

.icon-btn-text {
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.icon-btn-text:hover {
  background: rgba(255,255,255,0.2);
}

/* Center Feedback */
.player-center-action {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.5);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: pulse-fade 0.5s ease-out forwards;
}

@keyframes pulse-fade {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
}

/* Subtitles Menu */
.player-sub-menu {
  position: absolute;
  bottom: 120px;
  right: 40px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 15px;
  min-width: 200px;
  z-index: 20;
}

.player-sub-menu h4 {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.5;
  margin-bottom: 15px;
  padding-left: 10px;
}

.player-sub-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 15px;
  background: none;
  border: none;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.player-sub-menu button:hover {
  background: rgba(255,255,255,0.1);
}

.player-sub-menu button.active {
  background: #ef4444;
  font-weight: 700;
}

.player-slide-enter-active, .player-slide-leave-active {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s;
}
.player-slide-enter-from, .player-slide-leave-to {
  transform: scale(1.1);
  opacity: 0;
}


/* --- SERIES EXPLORER STYLES --- */
.eos-series-explorer {
  margin-top: 30px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.season-badges {
  display: flex;
  gap: 10px;
}

.season-badge {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  padding: 6px 15px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.season-badge:hover {
  background: rgba(255,255,255,0.1);
}

.season-badge.active {
  background: #ef4444;
  border-color: #ef4444;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
}

.episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.episode-card {
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.episode-card:hover {
  transform: translateY(-5px);
  background: rgba(255,255,255,0.08);
}

.ep-poster-wrapper {
  position: relative;
  aspect-ratio: 16/9;
  background: #0f172a;
}

.ep-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ep-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.episode-card:hover .ep-overlay {
  opacity: 1;
}

.ep-progress-mini {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255,255,255,0.2);
}

.ep-progress-fill {
  height: 100%;
  background: #ef4444;
}

.ep-info {
  padding: 12px;
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.ep-number {
  color: #ef4444;
  font-weight: 800;
  font-size: 0.9rem;
}

.ep-title {
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}


/* --- FULL PAGE SERIES EXPLORER --- */
.eos-full-series-page {
  padding: 0;
  margin: -30px; /* Offset parent padding if any */
  min-height: 100vh;
  background: #0f172a;
}

.series-hero-banner-full {
  height: 500px;
  position: relative;
  background-size: cover;
  background-position: center 20%;
  padding: 40px;
  display: flex;
  align-items: flex-end;
}

.hero-content-full {
  position: relative;
  z-index: 2;
  width: 100%;
}

.back-nav-btn {
  position: absolute;
  top: -300px;
  left: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  padding: 10px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.back-nav-btn:hover {
  background: rgba(0,0,0,0.8);
}

.hero-main-info {
  display: flex;
  gap: 40px;
  align-items: flex-end;
}

.hero-poster-lg {
  width: 240px;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.6);
}

.hero-text-lg {
  flex: 1;
  padding-bottom: 20px;
}

.hero-title-lg {
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 10px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.hero-desc-lg {
  font-size: 1.1rem;
  max-width: 800px;
  opacity: 0.8;
  margin: 20px 0;
  line-height: 1.6;
}

.explorer-inner-section {
  padding: 40px;
}

.section-label {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #94a3b8;
}

/* Cast Row */
.cast-row-scroll {
  display: flex;
  gap: 15px;
  overflow-x: auto;
  padding-bottom: 15px;
}

.cast-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.05);
  padding: 8px 15px;
  border-radius: 40px;
  flex-shrink: 0;
}

.cast-pill img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.a-name { font-weight: 600; display: block; font-size: 0.9rem; }
.a-char { font-size: 0.75rem; opacity: 0.5; display: block; }

/* Season Chips */
.season-chips {
  display: flex;
  gap: 10px;
}

.season-chip {
  background: rgba(255,255,255,0.05);
  border: none;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.season-chip.active {
  background: #ef4444;
}

/* Wide Episode Cards */
.episodes-grid-full {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 25px;
  margin-top: 20px;
}

.ep-card-wide {
  display: flex;
  gap: 20px;
  background: rgba(255,255,255,0.03);
  padding: 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.ep-card-wide:hover {
  background: rgba(255,255,255,0.08);
}

.ep-thumb {
  width: 180px;
  aspect-ratio: 16/9;
  position: relative;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
}

.ep-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ep-play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.ep-card-wide:hover .ep-play-overlay { opacity: 1; }

.ep-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.ep-num-v { color: #ef4444; font-weight: 800; margin-right: 10px; }
.ep-name-v { font-weight: 600; font-size: 1.1rem; }
.ep-desc-v { font-size: 0.85rem; opacity: 0.6; margin-top: 8px; line-height: 1.4; }


/* --- PLEX STYLE SERIES VIEW --- */
.series-header-plex {
  display: flex;
  gap: 40px;
  padding: 20px;
  margin-bottom: 40px;
}

.header-poster-container {
  width: 220px;
  flex-shrink: 0;
}

.header-poster-main {
  width: 100%;
  border-radius: 4px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.05);
}

.poster-footer-info {
  margin-top: 15px;
  font-size: 0.75rem;
  color: #888;
  text-align: center;
  font-weight: 500;
}

.header-details-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-top: 10px;
}

.header-title-main {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: #eee;
}

.header-rating {
  display: flex;
  gap: 4px;
  margin-bottom: 25px;
}

.header-actions-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-play-plex {
  background: #eab308;
  color: black;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
}

.btn-play-plex:hover {
  background: #ca8a04;
  transform: scale(1.05);
}

.btn-circle-plex {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-circle-plex:hover {
  background: rgba(255,255,255,0.15);
}

.seasons-section-plex {
  padding: 0 20px;
}

.section-title-plex {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 25px;
  color: #eee;
}

.seasons-grid-plex {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 25px;
}

.season-card-plex {
  cursor: pointer;
  transition: transform 0.2s;
}

.season-card-plex:hover {
  transform: translateY(-5px);
}

.season-poster-plex {
  position: relative;
  aspect-ratio: 2/3;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  margin-bottom: 12px;
  border: 1px solid rgba(255,255,255,0.05);
}

.season-poster-plex img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.season-badge-plex {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 0.7rem;
  font-weight: 700;
}

.season-name-plex {
  font-weight: 600;
  font-size: 0.95rem;
  color: #eee;
  margin-bottom: 4px;
}

.season-count-plex {
  font-size: 0.8rem;
  color: #888;
}

.season-card-plex.active .season-poster-plex {
  outline: 3px solid #eab308;
  outline-offset: 2px;
}
</style>
