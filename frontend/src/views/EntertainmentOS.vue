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

          <!-- Sections -->
          <section class="eos-media-section" v-for="section in mediaSections" :key="section.title">
            <div class="eos-section-header">
              <h2>{{ section.title }}</h2>
            </div>
            <div class="eos-media-row" v-if="section.items.length > 0">
              <div
                v-for="media in section.items"
                :key="'sec-'+media.id"
                class="eos-media-card"
                @click="openMediaDetail(media)"
              >
                <div class="eos-card-poster">
                  <img :src="media.poster" :alt="media.title" loading="lazy" />
                  <div class="eos-card-overlay">
                    <button class="eos-play-btn"><Play :size="24" /></button>
                  </div>
                  <span v-if="media.is_new" class="eos-new-badge">NUEVO</span>
                </div>
                <div class="eos-card-info">
                  <div class="eos-card-title">{{ media.title }}</div>
                  <div class="eos-card-meta">{{ media.year }} · {{ media.genre }}</div>
                </div>
              </div>
            </div>
            <div v-else class="eos-empty-section">
               <p>No hay contenido en esta sección.</p>
            </div>
          </section>
        </template>

        <!-- Movies View -->
        <template v-if="activeNav === 'movies'">
          <section class="eos-grid-section">
            <h2 class="eos-page-title">Películas</h2>
            <div class="eos-media-grid" v-if="filteredMedia.filter(m => m.type === 'movie').length > 0">
              <div
                v-for="media in filteredMedia.filter(m => m.type === 'movie')"
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
            <h2 class="eos-page-title">Series</h2>
            <div class="eos-media-grid" v-if="seriesMedia.length > 0">
              <div
                v-for="media in seriesMedia"
                :key="'ser-'+media.id"
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
                  <div class="eos-card-meta">{{ media.genre }}</div>
                </div>
              </div>
            </div>
            <div v-else class="eos-empty-grid">Sin series disponibles</div>
          </section>
        </template>

        <!-- Music View -->
        <template v-if="activeNav === 'music'">
          <section class="eos-grid-section">
            <h2 class="eos-page-title">Música</h2>
            <div class="eos-music-grid" v-if="musicTracks.length > 0">
              <div v-for="track in musicTracks" :key="'mus-'+track.id" class="eos-music-card">
                <div class="eos-music-cover">
                  <div class="eos-music-cover-art" :style="{ background: track.color }">
                    <Music :size="28" />
                  </div>
                  <div class="eos-music-play-overlay">
                    <Play :size="22" />
                  </div>
                </div>
                <div class="eos-music-info">
                  <div class="eos-music-title">{{ track.title }}</div>
                  <div class="eos-music-artist">{{ track.artist }}</div>
                </div>
              </div>
            </div>
            <div v-else class="eos-empty-grid">Sin música</div>
          </section>
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
                  <div class="stat-card warning" v-if="adminStats.noPoster > 0">
                    <Info :size="24" />
                    <div class="stat-val">{{ adminStats.noPoster }}</div>
                    <div class="stat-label">Sin Poster</div>
                  </div>
                </div>
              </div>

              <div v-if="activeAdminTab === 'media'" class="admin-libraries">
                <div class="media-management-grid">
                  <div class="table-container">
                    <div class="table-header">
                      <h3>Gestión Global de Medios ({{ allAdminMedia.length }})</h3>
                      <div class="mini-search">
                        <Search :size="14" />
                        <input v-model="adminSearch" type="text" placeholder="Buscar en todo el catálogo..." />
                      </div>
                    </div>
                    <div class="eos-scroll-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Poster</th>
                            <th>Título / Metadata</th>
                            <th>Tipo</th>
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
                              </div>
                            </td>
                            <td><span class="type-tag">{{ m.type }}</span></td>
                            <td><code class="file-path-code" :title="m.file_path">{{ m.file_path.split('/').pop() }}</code></td>
                            <td class="table-btns">
                              <button @click="openIdentify(m)" class="btn-edit" title="Identificar (TMDB)"><Search :size="14" /></button>
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

      <!-- Detail Modal -->
      <Transition name="modal-fade">
        <div v-if="selectedMedia" class="eos-modal-overlay" @click.self="selectedMedia = null">
          <div class="eos-modal">
            <button class="eos-modal-close" @click="selectedMedia = null"><X :size="20" /></button>
            <div class="eos-modal-banner" :style="{ backgroundImage: `url(${selectedMedia.poster})` }">
              <div class="eos-modal-banner-content">
                <h2>{{ selectedMedia.title }}</h2>
              </div>
            </div>
            <div class="eos-modal-body">
              <p class="eos-modal-desc">{{ selectedMedia.description || 'Sin descripción disponible.' }}</p>
              
              <div v-if="selectedMedia.isSeriesGroup" class="eos-episodes-list">
                <h3>Episodios</h3>
                <div v-for="ep in getEpisodes(selectedMedia.series_name)" :key="'ep-'+ep.id" class="eos-episode-item" @click="playMedia(ep)">
                  <div class="eos-ep-num">T{{ ep.season }} E{{ ep.episode }}</div>
                  <div class="eos-ep-title">{{ ep.title }}</div>
                  <button class="eos-ep-play"><Play :size="14" /></button>
                </div>
              </div>

              <div v-else class="eos-modal-actions">
                <button class="eos-btn-primary" @click="playMedia(selectedMedia)"><Play :size="18" /> Reproducir</button>
                <button 
                  class="eos-btn-secondary" 
                  :class="{ 'is-fav': isFavorite(selectedMedia) }"
                  @click="toggleFavorite(selectedMedia)"
                >
                  <Star :size="18" :fill="isFavorite(selectedMedia) ? '#f59e0b' : 'none'" /> 
                  {{ isFavorite(selectedMedia) ? 'En Favoritos' : 'Favoritos' }}
                </button>
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

      <!-- Embedded Player Overlay -->
      <Transition name="player-slide">
        <div v-if="showPlayer" class="eos-player-overlay">
          <header class="player-top-bar">
            <button @click="closePlayer" class="player-back-btn">
              <ChevronLeft :size="24" />
              <span>Volver a EntertainmentOS</span>
            </button>
            <div class="player-current-title">{{ playerTitle }}</div>
          </header>
          
          <div class="player-video-wrapper">
            <video 
              ref="videoRef"
              :src="playerSource"
              controls
              autoplay
              class="eos-internal-video"
              @timeupdate="handleInternalTimeUpdate"
              @ended="handleInternalEnded"
            ></video>
          </div>
        </div>
      </Transition>

      <!-- Identify Media Modal (TMDB) -->
      <Transition name="modal-fade">
        <div v-if="showIdentifyModal" class="eos-modal-overlay" @click.self="showIdentifyModal = false">
          <div class="eos-modal identify-modal">
            <header class="eos-modal-header-simple">
              <h3>Identificar Medios</h3>
              <button class="eos-modal-close-small" @click="showIdentifyModal = false"><X :size="18" /></button>
            </header>
            
            <div class="identify-body">
              <div class="identify-search-box">
                <Search :size="18" class="text-slate-400" />
                <input 
                  v-model="tmdbSearchQuery" 
                  type="text" 
                  placeholder="Escribre el nombre de la película o serie..."
                  @keyup.enter="searchTmdb"
                />
                <button @click="searchTmdb" class="eos-btn-primary mini">Buscar</button>
              </div>

              <div class="identify-results">
                <div v-if="tmdbSearchLoading" class="loading-full"><Loader2 class="spinning" /></div>
                <div v-else-if="tmdbSearchResults.length === 0" class="no-results">
                  Busca por título para identificar el archivo: <code>{{ identifyingMedia?.file_path.split('/').pop() }}</code>
                </div>
                <div v-else class="tmdb-results-list">
                   <div v-for="res in tmdbSearchResults" :key="'tmdb-'+res.id" class="tmdb-res-card" @click="identifyItem(res.id)">
                      <img :src="res.poster || '/entertainment/posters/stellar_horizon.png'" class="res-poster" />
                      <div class="res-info">
                        <span class="res-title">{{ res.title }}</span>
                        <span class="res-year">{{ res.year }}</span>
                        <p class="res-desc">{{ res.description ? res.description.substring(0, 100) + '...' : 'Sin descripción' }}</p>
                      </div>
                      <button class="btn-link-tmdb">Vincular</button>
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
  ChevronLeft, ChevronRight, Play, Info, Settings2, X, Plus, Star, Loader2, Trash2, Folder, MonitorPlay,
  RotateCcw, ListMusic
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
const adminStats = ref({ movies: 0, series: 0, music: 0, noPoster: 0, lastAdded: [] });

// Computed
const filteredMedia = computed(() => {
  if (!searchQuery.value) return allMedia.value;
  const q = searchQuery.value.toLowerCase();
  return allMedia.value.filter(m => 
    (m.title || '').toLowerCase().includes(q) || 
    (m.series_name || '').toLowerCase().includes(q)
  );
});

const seriesMedia = computed(() => {
  const series = filteredMedia.value.filter(m => m.type === 'series');
  const unique: any[] = [];
  const seen = new Set();
  series.forEach(s => {
    if (!seen.has(s.series_name)) {
      seen.add(s.series_name);
      unique.push({ ...s, title: s.series_name, isSeriesGroup: true });
    }
  });
  return unique;
});

const getEpisodes = (name: string) => 
  allMedia.value.filter(m => m.series_name === name).sort((a,b) => a.episode - b.episode);

const mediaSections = computed(() => [
  { title: 'Agregados Recientemente', items: allMedia.value.filter(m => m.is_new === 1).slice(0, 10) },
  { title: 'Top Valoradas', items: allMedia.value.filter(m => (m.stars || 0) >= 4).slice(0, 10) }
]);

const musicTracks = computed(() => 
  filteredMedia.value.filter(m => m.type === 'music').map(m => ({
    ...m, artist: m.genre || 'Artista', color: `hsl(${(m.id * 137) % 360}, 60%, 40%)`
  }))
);

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
      poster: m.poster_path ? `/api/entertainment/poster/${m.id}?token=${token}` : '/entertainment/posters/stellar_horizon.png'
    }));
  } catch (err) {
    notification.error('Error', 'No se pudo cargar el catálogo');
  } finally {
    loading.value = false;
  }
};

const fetchAdminData = async () => {
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

const playMedia = async (m: any) => {
  const token = localStorage.getItem('nubeos_token');
  const streamUrl = `/api/entertainment/stream/${m.id}?token=${token}`;
  
  playerSource.value = streamUrl;
  playerTitle.value = m.title;
  playerMediaId.value = m.id;
  showPlayer.value = true;
  
  const startTime = m.progress || 0;
  lastSavedTime.value = startTime;
  
  await loadHlsScript();

  setTimeout(() => {
    if (!videoRef.value) return;
    
    if (hls.value) {
      hls.value.destroy();
      hls.value = null;
    }

    // Normal stream might also be HLS depending on backend transcoding (currently it's direct file stream)
    // For now we assume direct stream unless it's obviously m3u8
    videoRef.value.src = streamUrl;

    videoRef.value.onloadedmetadata = () => {
      if (videoRef.value && startTime > 0) {
        videoRef.value.currentTime = startTime;
      }
      videoRef.value?.play();
    };
  }, 300);

  selectedMedia.value = null;
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

const handleInternalTimeUpdate = () => saveInternalProgress();
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
  tmdbSearchQuery.value = media.title;
  tmdbSearchResults.value = [];
  showIdentifyModal.value = true;
};

const searchTmdb = async () => {
  if (!tmdbSearchQuery.value) return;
  tmdbSearchLoading.value = true;
  try {
    const res = await axios.get('/api/entertainment/admin/tmdb/search', {
      params: { query: tmdbSearchQuery.value, type: identifyingMedia.value?.type }
    });
    tmdbSearchResults.value = res.data;
  } catch (err) {
    notification.error('Error', 'No se pudo buscar en TMDB');
  } finally {
    tmdbSearchLoading.value = false;
  }
};

const identifyItem = async (tmdbId: number) => {
  if (!identifyingMedia.value) return;
  loading.value = true;
  try {
    const res = await axios.post('/api/entertainment/admin/media/identify', {
      mediaId: identifyingMedia.value.id,
      tmdbId,
      type: identifyingMedia.value.type
    });
    notification.success('Identificado', 'Metadatos actualizados correctamente.');
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

const openMediaDetail = (m: any) => selectedMedia.value = m;

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
.eos-hero-slide { min-width: 100%; background-size: cover; background-position: center; position: relative; display: flex; align-items: flex-end; padding: 3rem; }
.eos-hero-overlay { position: absolute; inset: 0; background: linear-gradient(0deg, #0b1120 0%, transparent 100%); }
.eos-hero-content { position: relative; z-index: 2; max-width: 500px; }
.eos-hero-title { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; }
.eos-hero-meta { display: flex; gap: 1rem; font-size: 0.8rem; color: #94a3b8; margin-bottom: 1rem; }
.eos-rating-badge { background: #f59e0b; color: #0b1120; padding: 2px 6px; border-radius: 4px; font-weight: 800; }
.eos-hero-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; background: rgba(0,0,0,0.5); border: none; color: white; border-radius: 50%; cursor: pointer; z-index: 5; }
.eos-hero-arrow.left { left: 20px; } .eos-hero-arrow.right { right: 20px; }
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
.eos-media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1.5rem; }
.eos-music-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1.5rem; padding: 2rem; }
.eos-music-card { background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; text-align: center; }
.eos-music-cover { aspect-ratio: 1; background: #1e293b; border-radius: 8px; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; }
.eos-admin-container { padding: 2rem; }
.admin-tabs { display: flex; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 2rem; }
.admin-tabs button { padding: 0.5rem 1rem; background: none; border: none; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; }
.admin-tabs button.active { color: #f59e0b; border-bottom-color: #f59e0b; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.stat-card { background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; }
.stat-val { font-size: 1.5rem; font-weight: 800; }
.eos-scroll-table { overflow-x: auto; margin-top: 1rem; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.8rem; }
.type-badge { background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; }
.table-btns { display: flex; gap: 4px; } .table-btns button { padding: 4px; border: none; border-radius: 4px; cursor: pointer; }
.eos-modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 100; }
.eos-modal { width: 90%; max-width: 600px; background: #111827; border-radius: 20px; overflow: hidden; position: relative; }
.eos-modal-banner { height: 250px; background-size: cover; display: flex; align-items: flex-end; padding: 2rem; position: relative; }
.eos-modal-body { padding: 2rem; } .eos-modal-desc { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
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
.btn-link-tmdb { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
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
</style>
