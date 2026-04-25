#!/bin/bash
# NubeOS Native Installer Engine
# Usage: ./install-to-disk.sh /dev/sdX username password hostname

set -e

TARGET_DISK=$1
USERNAME=$2
PASSWORD=$3
HOSTNAME=$4

if [ -z "$TARGET_DISK" ]; then echo "Error: No se especificó disco"; exit 1; fi

echo "=== INICIANDO INSTALACIÓN NATIVA DE NubeOS en $TARGET_DISK ==="

# 1. Limpiar tabla de particiones
echo "Limpiando disco..."
dd if=/dev/zero of=$TARGET_DISK bs=512 count=1 conv=notrunc

# 2. Crear particiones (GPT)
# P1: EFI (512MB), P2: ROOT (Resto)
echo "Particionando disco..."
parted -s $TARGET_DISK mklabel gpt
parted -s $TARGET_DISK mkpart ESP fat32 1MiB 513MiB
parted -s $TARGET_DISK set 1 esp on
parted -s $TARGET_DISK mkpart primary ext4 513MiB 100%

# 3. Formatear
echo "Formateando particiones..."
mkfs.fat -F 32 "${TARGET_DISK}1"
mkfs.ext4 -F "${TARGET_DISK}2"

# 4. Montar
mkdir -p /mnt/target
mount "${TARGET_DISK}2" /mnt/target
mkdir -p /mnt/target/boot/efi
mount "${TARGET_DISK}1" /mnt/target/boot/efi

# 5. Copiar el sistema (Sync del entorno Live al disco)
echo "Copiando archivos del sistema (esto puede tardar)..."
# Usamos rsync para copiar todo excepto carpetas virtuales
rsync -aAXv --exclude={"/dev/*","/proc/*","/sys/*","/tmp/*","/run/*","/mnt/*","/media/*","/lost+found"} / /mnt/target/

# 6. Configurar el nuevo sistema (chroot)
echo "Configurando el nuevo sistema..."

# Montar binds para el chroot
for dir in dev proc sys run; do mount --bind /$dir /mnt/target/$dir; done

chroot /mnt/target bash <<EOF
  # Establecer Hostname
  echo "$HOSTNAME" > /etc/hostname
  echo "127.0.0.1 localhost $HOSTNAME" > /etc/hosts

  # Crear Usuario Administrador (mismo de NubeOS)
  useradd -m -s /bin/bash "$USERNAME"
  echo "$USERNAME:$PASSWORD" | chpasswd
  usermod -aG sudo "$USERNAME"
  usermod -aG docker "$USERNAME"

  # Configurar GRUB
  grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=NubeOS --recheck
  update-grub

  # Habilitar servicios de NubeOS
  systemctl enable docker
  systemctl enable nubeos
EOF

# 7. Limpieza
echo "Desmontando..."
umount -R /mnt/target

echo "¡INSTALACIÓN COMPLETADA! Por favor, reinicia y retira el medio de instalación."
