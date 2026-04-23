let datosHistoricos = []; // Ahora es un array
let mapaPrecios = {};     // Objeto auxiliar para búsquedas rápidas por fecha
let chartInstance = null; // Variable global para el gráfico

async function cargarDatos() {
    const hoy = new Date().toISOString().split('T')[0];
    const cacheKey = 'dollar_data';
    const cacheDateKey = 'dollar_data_date';

    const cacheGuardada = localStorage.getItem(cacheKey);
    const fechaCache = localStorage.getItem(cacheDateKey);

    if (!cacheGuardada || fechaCache !== hoy) {
        try {
            const response = await fetch('https://d.precioslideres.com/dollarHistory.json');
            const jsonBruto = await response.json();
            
            // Procesamos el JSON para facilitar su uso
            procesarDatos(jsonBruto);
            
            localStorage.setItem(cacheKey, JSON.stringify(jsonBruto));
            localStorage.setItem(cacheDateKey, hoy);
        } catch (error) {
            console.error("Error cargando JSON:", error);
            if (cacheGuardada) procesarDatos(JSON.parse(cacheGuardada));
        }
    } else {
        procesarDatos(JSON.parse(cacheGuardada));
    }
    
    renderizarGrafica();
}

function procesarDatos(data) {
    // 1. Guardamos los datos originales
    datosHistoricos = data;

    // 2. Creamos un mapa { "YYYY-MM-DD": precio } para la búsqueda rápida
    mapaPrecios = {};
    data.forEach(item => {
        const fechaCorta = item.createdAt.split('T')[0];
        mapaPrecios[fechaCorta] = item.price;
    });
}

function actualizarRango(dias) {
    const ahora = new Date();
    let datosFiltrados = [...datosHistoricos].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (dias > 0) {
        const fechaLimite = new Date();
        fechaLimite.setDate(ahora.getDate() - dias);
        
        datosFiltrados = datosFiltrados.filter(item => new Date(item.createdAt) >= fechaLimite);
    }

    renderizarGrafica(datosFiltrados);
}

function renderizarGrafica(datosParaMostrar = null) {
    const ctx = document.getElementById('precioChart').getContext('2d');
    
    // Si no se pasan datos (carga inicial), usamos todo el historial ordenado
    const data = datosParaMostrar || [...datosHistoricos].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const labels = data.map(item => item.createdAt.split('T')[0]);
    const valores = data.map(item => parseFloat(item.price));

    // Si ya existe un gráfico, lo destruimos antes de crear el nuevo
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Precio del Dólar',
                data: valores,
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderWidth: 2,
                pointRadius: labels.length > 50 ? 0 : 3, // Oculta puntos si hay demasiados
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true }
            },
            scales: {
                x: { 
                    ticks: { 
                        maxTicksLimit: 12,
                        maxRotation: 45,
                        minRotation: 45
                    } 
                }
            }
        }
    });
}

function consultarPrecio() {
    let fechaSeleccionada = document.getElementById('date-picker').value;
    if (!fechaSeleccionada) return;

    let d = new Date(fechaSeleccionada + "T00:00:00");
    let diaSemana = d.getDay(); 

    // Lógica de fin de semana: Sábado -> Lunes (+2), Domingo -> Lunes (+1)
    if (diaSemana === 6) d.setDate(d.getDate() + 2);
    else if (diaSemana === 0) d.setDate(d.getDate() + 1);

    const fechaFinal = d.toISOString().split('T')[0];
    const precio = mapaPrecios[fechaFinal];

    const display = document.getElementById('resultado-busqueda');
    if (precio) {
        // Formateamos a 2 o 4 decimales según prefieras
        const precioFormateado = parseFloat(precio).toFixed(2);
        display.innerHTML = `Precio para el <strong>${fechaFinal}</strong>: <span style="color: #27ae60;">${precioFormateado}</span>`;
    } else {
        display.innerText = "No hay datos para esa fecha específica.";
    }
}

cargarDatos();
