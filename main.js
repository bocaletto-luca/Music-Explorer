document.addEventListener("DOMContentLoaded", function() {
      /* -------- Toggle Tema Day/Night -------- */
      const themeToggle = document.getElementById("themeToggle");
      const themeText = document.getElementById("themeText");
      themeToggle.addEventListener("change", function() {
        if(this.checked) {
          document.body.classList.remove("day");
          document.body.classList.add("night");
          themeText.textContent = "Night";
        } else {
          document.body.classList.remove("night");
          document.body.classList.add("day");
          themeText.textContent = "Day";
        }
      });
      
      /* -------- Variabili Globali -------- */
      let allResults = [];            // Risultati completi dalla ricerca (dai checkbox uniti)
      let filteredResults = [];       // Risultati dopo applicazione dei filtri (periodo, lettera, genere)
      let currentSortedResults = [];  // Array finale ordinato
      let currentPage = 1;
      let pageSize = 20;
      let orderOption = "title";      // Ordinamento: "title", "artist", "release"
      let musicChart;
      
      // Filtri aggiuntivi
      let activeLetter = "ALL";
      let activeGenre = "ALL";
      let periodStart = "";
      let periodEnd = "";
      
      /* -------- Elementi HTML di Riferimento -------- */
      const musicContainer = document.getElementById("musicContainer");
      const paginationContainer = document.getElementById("paginationContainer");
      const genreMenu = document.getElementById("genreMenu");
      const letterMenu = document.getElementById("letterMenu");
      
      // Checkbox per Tipologia
      const chkArtist = document.getElementById("chkArtist");
      const chkSong = document.getElementById("chkSong");
      const chkAlbum = document.getElementById("chkAlbum");
  
      /* -------- Funzione: Ricerca tramite iTunes Search API -------- */
      async function searchMusic(query) {
        try {
          // Se l'utente non inserisce un termine, usa "a" per ottenere un dataset ampio
          if(query.length === 0) {
            query = "a";
          }
          // Imposta il limite a 200
          let promises = [];
          if(chkArtist.checked) {
            promises.push(
              fetch("https://itunes.apple.com/search?term=" + encodeURIComponent(query) + "&entity=musicArtist&limit=200")
                .then(res => res.json()).then(data => data.results || [])
            );
          }
          if(chkSong.checked) {
            promises.push(
              fetch("https://itunes.apple.com/search?term=" + encodeURIComponent(query) + "&entity=song&limit=200")
                .then(res => res.json()).then(data => data.results || [])
            );
          }
          if(chkAlbum.checked) {
            promises.push(
              fetch("https://itunes.apple.com/search?term=" + encodeURIComponent(query) + "&entity=album&limit=200")
                .then(res => res.json()).then(data => data.results || [])
            );
          }
          const resultsArrays = await Promise.all(promises);
          allResults = [].concat(...resultsArrays);
          // Resetta filtri extra
          document.getElementById("startYear").value = "";
          document.getElementById("endYear").value = "";
          periodStart = "";
          periodEnd = "";
          activeLetter = "ALL";
          activeGenre = "ALL";
          generateLetterMenu();
          generateGenreMenu();
          currentPage = 1;
          orderOption = "title";
          filteredResults = allResults.slice();
          updateDisplay();
        } catch(error) {
          console.error(error);
          musicContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
      }
  
      // Listener sui bottoni di ricerca e ripristino
      document.getElementById("btnSearch").addEventListener("click", function() {
        const query = document.getElementById("queryInput").value.trim();
        searchMusic(query);
      });
      document.getElementById("btnAll").addEventListener("click", function() {
        document.getElementById("queryInput").value = "";
        filteredResults = allResults.slice();
        activeLetter = "ALL";
        activeGenre = "ALL";
        setActiveLetter("ALL");
        setActiveGenre("ALL");
        updateDisplay();
      });
  
      /* -------- Filtro per Periodo -------- */
      document.getElementById("btnFilterPeriod").addEventListener("click", function() {
        periodStart = document.getElementById("startYear").value.trim();
        periodEnd = document.getElementById("endYear").value.trim();
        applyFilters();
      });
  
      /* -------- Genera Menu Alfabeto (sempre visibile) -------- */
      function generateLetterMenu() {
        letterMenu.innerHTML = "";
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        const allBtn = document.createElement("button");
        allBtn.textContent = "ALL";
        allBtn.classList.add("active");
        allBtn.addEventListener("click", function() {
          activeLetter = "ALL";
          setActiveLetter("ALL");
          applyFilters();
        });
        letterMenu.appendChild(allBtn);
        letters.forEach(letter => {
          const btn = document.createElement("button");
          btn.textContent = letter;
          btn.addEventListener("click", function() {
            activeLetter = letter;
            setActiveLetter(letter);
            applyFilters();
          });
          letterMenu.appendChild(btn);
        });
      }
      function setActiveLetter(letter) {
        const buttons = letterMenu.querySelectorAll("button");
        buttons.forEach(btn => {
          if(btn.textContent === letter) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });
      }
  
      /* -------- Genera Menu Generi (sempre visibile) -------- */
      function generateGenreMenu() {
        genreMenu.innerHTML = "";
        let genresSet = new Set();
        allResults.forEach(item => {
          if(item.primaryGenreName) {
            genresSet.add(item.primaryGenreName);
          }
        });
        const genres = Array.from(genresSet).sort();
        const allBtn = document.createElement("button");
        allBtn.textContent = "ALL";
        allBtn.classList.add("active");
        allBtn.addEventListener("click", function() {
          activeGenre = "ALL";
          setActiveGenre("ALL");
          applyFilters();
        });
        genreMenu.appendChild(allBtn);
        genres.forEach(genre => {
          const btn = document.createElement("button");
          btn.textContent = genre;
          btn.addEventListener("click", function() {
            activeGenre = genre;
            setActiveGenre(genre);
            applyFilters();
          });
          genreMenu.appendChild(btn);
        });
      }
      function setActiveGenre(genreName) {
        const buttons = genreMenu.querySelectorAll("button");
        buttons.forEach(btn => {
          if(btn.textContent === genreName) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });
      }
  
      /* -------- Applica Filtri Combinati: Lettera, Genere, Periodo -------- */
      function applyFilters() {
        let temp = allResults.slice();
        // Filtro per lettera (usa il nome rilevante: artist, brano o album)
        if(activeLetter !== "ALL") {
          temp = temp.filter(item => {
            const name = getItemName(item);
            return name && name.charAt(0).toUpperCase() === activeLetter;
          });
        }
        // Filtro per genere
        if(activeGenre !== "ALL") {
          temp = temp.filter(item => item.primaryGenreName === activeGenre);
        }
        // Filtro per periodo (solo per brani e album, dato che hanno releaseDate)
        if((chkSong.checked || chkAlbum.checked) && periodStart) {
          temp = temp.filter(item => {
            if(item.releaseDate) {
              const year = parseInt(item.releaseDate.substring(0,4));
              if(periodStart && isFinite(periodStart) && year < parseInt(periodStart)) return false;
              if(periodEnd && isFinite(periodEnd) && year > parseInt(periodEnd)) return false;
              return true;
            }
            return false;
          });
        }
        filteredResults = temp;
        updateDisplay();
      }
  
      /* -------- Aggiorna Ordinamento e Visualizzazione -------- */
      function updateDisplay() {
        let temp = filteredResults.slice();
        if(orderOption === "title") {
          temp.sort((a, b) => getItemName(a).localeCompare(getItemName(b)));
        } else if(orderOption === "artist") {
          temp.sort((a, b) => {
            const artA = a.artistName || "";
            const artB = b.artistName || "";
            return artA.localeCompare(artB);
          });
        } else if(orderOption === "release") {
          temp.sort((a, b) => {
            const dA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
            const dB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
            return dA - dB;
          });
        }
        currentSortedResults = temp;
        currentPage = 1;
        renderMusicCards();
        generatePagination();
        updateChart();
      }
  
      /* -------- Helper: Ottieni Nome dell'Elemento -------- */
      function getItemName(item) {
        if(item.wrapperType === "track") return item.trackName || "";
        if(item.wrapperType === "collection") return item.collectionName || "";
        if(item.wrapperType === "artist") return item.artistName || "";
        return item.trackName || item.collectionName || item.artistName || "";
      }
  
      /* -------- Helper: Ottieni ID Unico -------- */
      function getItemId(item) {
        if(item.trackId) return item.trackId;
        if(item.collectionId) return item.collectionId;
        if(item.artistId) return item.artistId;
        return 0;
      }
  
      /* -------- Renderizza le Card dei Risultati (impaginate) -------- */
      function renderMusicCards() {
        musicContainer.innerHTML = "";
        const startIdx = (currentPage - 1) * pageSize;
        const pageData = currentSortedResults.slice(startIdx, startIdx + pageSize);
        if(pageData.length === 0) {
          musicContainer.innerHTML = "<p class='text-center'>Nessun risultato trovato.</p>";
          return;
        }
        pageData.forEach(item => {
          const title = getItemName(item) || "N/D";
          const imageUrl = item.artworkUrl100 || "";
          const artist = item.artistName || "N/D";
          const releaseDate = item.releaseDate ? item.releaseDate.substring(0,10) : "N/D";
          let previewHtml = "";
          if(item.wrapperType === "track" && item.previewUrl) {
            previewHtml = `<audio controls style="width:100%; max-width:300px;">
                             <source src="${item.previewUrl}" type="audio/mpeg">
                             Il tuo browser non supporta l'audio.
                           </audio>`;
          }
          const card = document.createElement("div");
          card.className = "music-card row";
          card.innerHTML = `
            <div class="col-md-3">
              ${ imageUrl ? `<img src="${imageUrl}" alt="${escapeHtml(title)}" class="img-fluid">`
                          : `<div class="bg-secondary text-white p-3">No Image</div>` }
            </div>
            <div class="col-md-9">
              <div class="card-body">
                <h4>${escapeHtml(title)}</h4>
                <p><strong>Artista:</strong> ${escapeHtml(artist)}</p>
                ${ item.releaseDate ? `<p><strong>Data:</strong> ${releaseDate}</p>` : "" }
                ${ previewHtml }
                <button class="btn btn-sm btn-secondary" onclick="loadItemDetails(${getItemId(item)})">Leggi di più</button>
              </div>
            </div>
          `;
          musicContainer.appendChild(card);
        });
      }
  
      /* -------- Genera Paginazione -------- */
      function generatePagination() {
        const totalPages = Math.ceil(currentSortedResults.length / pageSize);
        let html = "";
        if(totalPages <= 1) {
          paginationContainer.innerHTML = "";
          return;
        }
        html += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
                   <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Prev</a>
                 </li>`;
        for(let i = 1; i <= totalPages; i++) {
          html += `<li class="page-item ${currentPage === i ? "active" : ""}">
                     <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                   </li>`;
        }
        html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
                   <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
                 </li>`;
        paginationContainer.innerHTML = html;
      }
  
      window.changePage = function(page) {
        currentPage = page;
        renderMusicCards();
        generatePagination();
      }
  
      /* -------- Aggiorna il Grafico (Conteggio per Genere) -------- */
      function updateChart() {
        let counts = {};
        currentSortedResults.forEach(item => {
          if(item.primaryGenreName) {
            counts[item.primaryGenreName] = (counts[item.primaryGenreName] || 0) + 1;
          }
        });
        const labels = Object.keys(counts);
        const dataArr = labels.map(label => counts[label]);
        const ctx = document.getElementById("musicChart").getContext("2d");
        if(musicChart instanceof Chart) {
          musicChart.destroy();
        }
        musicChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: labels,
            datasets: [{
              label: "Risultati per Genere",
              data: dataArr,
              backgroundColor: "rgba(54, 162, 235, 0.6)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
          }
        });
      }
  
      /* -------- Listener Ordinamenti -------- */
      document.getElementById("btnSortTitle").addEventListener("click", function() {
        orderOption = "title";
        updateDisplay();
      });
      document.getElementById("btnSortArtist").addEventListener("click", function() {
        orderOption = "artist";
        updateDisplay();
      });
      document.getElementById("btnSortRelease").addEventListener("click", function() {
        orderOption = "release";
        updateDisplay();
      });
  
      /* -------- Funzione Helper: Escape dei Caratteri HTML -------- */
      function escapeHtml(text) {
        if(typeof text !== "string") return text;
        const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
        return text.replace(/[&<>"']/g, m => map[m]);
      }
  
      // Avvia una ricerca di default (termine "a") per popolare il dataset fin da subito
      searchMusic("a");
    });
