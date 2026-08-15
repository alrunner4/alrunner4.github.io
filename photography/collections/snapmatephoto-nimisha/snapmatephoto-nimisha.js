
    // Initialize WebTorrent client
    const client = new WebTorrent();

    // DOM Elements
    const headerProgressContainer = document.getElementById('header-progress-container');
    const headerProgressText = document.getElementById('header-progress-text');
    const headerProgressBar = document.getElementById('header-progress-bar');

    const galleryGrid = document.getElementById('gallery-grid');
    const emptyState = document.getElementById('empty-state');
    
    const gallerySelect = document.getElementById('gallery-select');
    const galleryTitleText = document.getElementById('gallery-title-text');
    const downloadAllBtn = document.getElementById('download-all-btn');

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxClose = document.getElementById('lightbox-close');

    let activeTorrent = null;
    let updateInterval = null;
    let galleryList = [];

    // Helper: Format byte count to human readable
    function formatBytes(bytes, decimals = 2) {
      if (bytes === 0) return '0 bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Helper: Format remaining time
    function formatRemaining(ms) {
      if (ms === Infinity || isNaN(ms) || ms <= 0) return '';
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      
      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
      
      return " " + parts.join(' ') + ' remaining';
    }

    // Open media in lightbox
    function openLightbox(file, type, blobUrl) {
      lightboxTitle.textContent = file.name;
      lightbox.classList.add('active');

      if (type === 'image') {
        lightboxImg.src = blobUrl;
        lightboxImg.classList.add('active');
        lightboxVideo.classList.remove('active');
        lightboxVideo.pause();
      } else if (type === 'video') {
        lightboxVideo.src = blobUrl;
        lightboxVideo.classList.add('active');
        lightboxImg.classList.remove('active');
        lightboxVideo.load();
        lightboxVideo.play();
      }
    }

    // Close lightbox
    function closeLightbox() {
      lightbox.classList.remove('active');
      lightboxImg.src = '';
      lightboxVideo.src = '';
      lightboxVideo.pause();
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === lightbox.querySelector('.lightbox-content')) {
        closeLightbox();
      }
    });

    // Populate gallery layout
    function setupGalleryGrid(files) {
      galleryGrid.innerHTML = '';
      
      // Filter image and video files
      const mediaFiles = files.filter(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'webm', 'ogg'].includes(ext);
      });

      if (mediaFiles.length === 0) {
        galleryGrid.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h3>No Media Found</h3>
            <p>This torrent doesn't seem to contain any supported image or video formats.</p>
          </div>
        `;
        return;
      }

      mediaFiles.forEach(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
        const fileType = isVideo ? 'video' : 'image';
        const badgeClass = isVideo ? 'badge-video' : 'badge-image';
        const badgeIcon = isVideo ? 'fa-video' : 'fa-image';

        // Card Container
        const card = document.createElement('div');
        card.className = 'media-card';
        card.id = `card-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

        // Preview Element
        card.innerHTML = `
          <div class="media-preview-container">
            <div class="skeleton" id="skeleton-${card.id}">
              <div class="skeleton-spinner"></div>
              <div class="skeleton-progress" id="progress-${card.id}">0%</div>
            </div>
            <div class="media-overlay" id="overlay-${card.id}" style="display:none;">
              <button class="icon-btn play-btn" id="play-${card.id}" title="View Media">
                <i class="fa-solid ${isVideo ? 'fa-play' : 'fa-maximize'}"></i>
              </button>
              <button class="icon-btn download-btn" id="dl-${card.id}" title="Download File">
                <i class="fa-solid fa-download"></i>
              </button>
            </div>
            <div class="media-preview-target" style="width:100%; height:100%;"></div>
          </div>
          <div class="media-info">
            <div class="media-name" title="${file.name}">${file.name}</div>
            <div class="media-meta">
              <span class="media-badge ${badgeClass}"><i class="fa-solid ${badgeIcon}"></i> ${fileType}</span>
              <span class="media-size">${formatBytes(file.length)}</span>
            </div>
          </div>
        `;

        galleryGrid.appendChild(card);

        // Track local download progress for each file
        const updateFileProgress = () => {
          const fileProg = file.progress;
          const progEl = document.getElementById(`progress-${card.id}`);
          if (progEl) {
            progEl.textContent = `${Math.floor(fileProg * 100)}%`;
          }
          if (file.done) {
            clearInterval(fileInterval);
          }
        };
        const fileInterval = setInterval(updateFileProgress, 500);

        // Render file content using WebTorrent once it is loaded
        file.getBlobURL((err, blobUrl) => {
          clearInterval(fileInterval);
          if (err) {
            console.error('Error getting blob URL:', err);
            const skeletonEl = document.getElementById(`skeleton-${card.id}`);
            if (skeletonEl) {
              skeletonEl.innerHTML = `<i class="fa-solid fa-xmark" style="color: var(--accent-pink); font-size: 1.5rem;"></i><p style="font-size:0.75rem;">Load Error</p>`;
            }
            return;
          }

          // Hide skeleton
          const skeleton = document.getElementById(`skeleton-${card.id}`);
          if (skeleton) skeleton.style.display = 'none';

          // Insert preview element
          const target = card.querySelector('.media-preview-target');
          let previewElement;
          if (isVideo) {
            previewElement = document.createElement('video');
            previewElement.className = 'media-preview loaded';
            previewElement.muted = true;
            previewElement.playsInline = true;
            previewElement.src = blobUrl;
            // Hover autoplay video preview
            card.addEventListener('mouseenter', () => {
              previewElement.play().catch(() => {});
            });
            card.addEventListener('mouseleave', () => {
              previewElement.pause();
              previewElement.currentTime = 0;
            });
          } else {
            previewElement = document.createElement('img');
            previewElement.className = 'media-preview loaded';
            previewElement.src = blobUrl;
            previewElement.alt = file.name;
          }
          target.appendChild(previewElement);

          // Show action overlay
          const overlay = document.getElementById(`overlay-${card.id}`);
          if (overlay) overlay.style.display = 'flex';

          // Bind Actions
          document.getElementById(`play-${card.id}`).addEventListener('click', () => {
            openLightbox(file, fileType, blobUrl);
          });

          document.getElementById(`dl-${card.id}`).addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
        });
      });
    }

    // Download entire gallery (archives when JSZip is available)
    async function downloadAll() {
      if (!activeTorrent) {
        alert('No gallery loaded to download.');
        return;
      }

      if (downloadAllBtn) {
        downloadAllBtn.disabled = true;
        downloadAllBtn.style.opacity = '0.6';
      }

      const getBlob = (file) => new Promise((resolve, reject) => {
        try {
          file.getBlob((err, b) => err ? reject(err) : resolve(b));
        } catch (e) { reject(e); }
      });

      try {
        // Use JSZip when available to create a single archive
        if (window.JSZip) {
          const zip = new JSZip();
          const folderName = galleryTitleText.textContent ? galleryTitleText.textContent.replace(/[^a-zA-Z0-9_\-]/g, '_') : 'gallery';
          const folder = zip.folder(folderName) || zip;

          headerProgressContainer.style.display = 'flex';
          headerProgressContainer.style.opacity = '1';
          headerProgressText.textContent = 'archiving gallery...';
          headerProgressBar.style.width = '0%';

          let i = 0;
          for (const file of activeTorrent.files) {
            i++;
            headerProgressText.textContent = `adding ${i}/${activeTorrent.files.length}: ${file.name}`;
            try {
              const blob = await getBlob(file);
              folder.file(file.name, blob);
            } catch (err) {
              console.warn('Failed to add file to archive:', file.name, err);
            }
          }

          const blob = await zip.generateAsync({ type: 'blob' }, (meta) => {
            headerProgressBar.style.width = `${Math.floor(meta.percent)}%`;
            headerProgressText.textContent = `compressing ${Math.round(meta.percent)}%`;
          });

          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${folderName}.zip`;
          document.body.appendChild(a);
          a.click();
          a.remove();

          headerProgressText.textContent = 'archive ready';
          setTimeout(() => {
            headerProgressContainer.style.opacity = '0';
          }, 1500);
        } else {
          // Fallback: trigger sequential downloads for each file
          headerProgressContainer.style.display = 'flex';
          headerProgressContainer.style.opacity = '1';
          headerProgressText.textContent = 'starting downloads...';

          for (const file of activeTorrent.files) {
            headerProgressText.textContent = `preparing: ${file.name}`;
            try {
              const blob = await getBlob(file);
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = file.name;
              document.body.appendChild(a);
              a.click();
              a.remove();
            } catch (err) {
              console.warn('Failed to download file:', file.name, err);
            }
          }

          headerProgressText.textContent = 'downloads started';
          setTimeout(() => { headerProgressContainer.style.opacity = '0'; }, 1500);
        }
      } catch (err) {
        console.error('Download all failed:', err);
        alert('Failed to download gallery: ' + (err && err.message ? err.message : err));
      } finally {
        if (downloadAllBtn) {
          downloadAllBtn.disabled = false;
          downloadAllBtn.style.opacity = '1';
        }
      }
    }

    // Bind download button if present
    if (downloadAllBtn) {
      downloadAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        downloadAll();
      });
    }

    // Global WebTorrent Error Handler
    client.on('error', (err) => {
      console.error('WebTorrent Global Error:', err);
      showTorrentLoadError(`WebTorrent error: ${err.message || err}`);
    });

    // Helper to display error in UI
    function showTorrentLoadError(message) {
      headerProgressContainer.style.opacity = '0';
      galleryGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-pink);"></i>
          <h3>Torrent Load Failed</h3>
          <p>${message}</p>
        </div>
      `;
    }

    // Load torrent helper
    function loadTorrent(torrentId) {
      // Clean up previous torrent if running
      if (activeTorrent) {
        clearInterval(updateInterval);
        try {
          client.remove(activeTorrent.infoHash);
        } catch (e) {
          console.error(e);
        }
      }

      // Reset progress bar elements
      headerProgressContainer.style.display = 'flex';
      headerProgressContainer.getBoundingClientRect(); // force reflow for opacity transition
      headerProgressContainer.style.opacity = '1';
      headerProgressText.textContent = 'Connecting to P2P swarm...';
      headerProgressBar.style.width = '0%';
      
      galleryGrid.innerHTML = `
        <div class="empty-state">
          <div class="skeleton-spinner" style="margin: 0 auto 1.5rem auto;"></div>
          <h3>Connecting to Album</h3>
          <p>You're downloading directly from Alex's storage. It might take a minute or two to establish a connection.</p>
        </div>
      `;

      // Check if input is a string (magnet, infohash or URL)
      if (typeof torrentId === 'string') {
        const trimmed = torrentId.trim();
        
        // Determine if it is a magnet URI or Info Hash
        const isMagnet = trimmed.startsWith('magnet:?');
        const isInfoHash = /^[0-9a-fA-F]{40}$/.test(trimmed) || /^[2-7a-zA-Z]{32}$/.test(trimmed);

        if (isMagnet || isInfoHash) {
          addTorrentToClient(trimmed);
        } else {
          // Assume it is a URL (relative or absolute)
          const absoluteUrl = new URL(trimmed, window.location.href).href;
          
          fetch(absoluteUrl)
            .then(res => {
              if (!res.ok) {
                throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
              }
              return res.blob();
            })
            .then(blob => {
              addTorrentToClient(blob);
            })
            .catch(err => {
                showTorrentLoadError(`Failed to download gallery metadata.<br>${err.message}<br>`);
            });
        }
      } else {
        // File or Blob from Drag & Drop or Input
        addTorrentToClient(torrentId);
      }
    }

    // Internal function to add the parsed source to WebTorrent
    function addTorrentToClient(source) {
      client.add(source, (torrent) => {
        activeTorrent = torrent;
        headerProgressText.textContent = 'loading gallery metadata';
        
        // Render file grid
        setupGalleryGrid(torrent.files);

        // Stats update interval
        updateInterval = setInterval(() => {
          // Progress Percentage
          const progress = torrent.progress;
          const pct = Math.floor(progress * 100);
          
          // Speed metrics
          const speedStr = formatBytes(torrent.downloadSpeed) + '/s';
          
          // Remaining Time
          if (torrent.done) {
            headerProgressText.textContent = `gallery download complete`;
            headerProgressBar.style.width = '100%';
            clearInterval(updateInterval);
            
            // Animate a fade to zero opacity shortly after download completion (2 seconds delay)
            setTimeout(() => {
              headerProgressContainer.style.opacity = '0';
              setTimeout(() => {
                headerProgressContainer.style.display = 'none';
              }, 1000); // match transition duration
            }, 2000);
          } else {
            const timeRemainingStr = formatRemaining(torrent.timeRemaining);
            if (torrent.downloadSpeed === 0) {
              headerProgressText.textContent = `connecting to album... this might take a few minutes`;
            } else {
              headerProgressText.textContent = `downloading gallery: ${pct}% at ${speedStr}${timeRemainingStr}`;
              headerProgressBar.style.width = `${progress * 100}%`;
            }
            }
        }, 1000);
      });
    }

    // Fetch galleries JSON manifest
    function loadGalleriesManifest() {
      fetch('galleries.json')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          galleryList = data;
          if (galleryList.length === 0) {
            showTorrentLoadError("No galleries found.");
            return;
          }

          // Populate select dropdown
          gallerySelect.innerHTML = '';
          galleryList.forEach((gal, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = gal.name;
            gallerySelect.appendChild(opt);
          });

          // Bind dropdown change event
          gallerySelect.onchange = (e) => {
            const selectedIndex = e.target.value;
            const selectedGal = galleryList[selectedIndex];
            galleryTitleText.textContent = selectedGal.name;
            loadTorrent(selectedGal.file);
          };

          // Load first gallery by default
          const firstGal = galleryList[0];
          galleryTitleText.textContent = firstGal.name;
          loadTorrent(firstGal.file);
        })
        .catch(err => {
          showTorrentLoadError(`Failed to load galleries manifest.<br><br><strong>Error:</strong> ${err.message}`);
        });
    }

    // Auto-load site's default torrent on start
    window.addEventListener('DOMContentLoaded', () => {
      loadGalleriesManifest();
    });

  

