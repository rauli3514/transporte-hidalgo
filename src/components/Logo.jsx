export function Logo({ style = {}, className = "" }) {
    return (
        <img
            src="/logo.svg"
            alt="Transporte Hidalgo Logo"
            className={className}
            style={{
                objectFit: 'contain',
                filter: 'brightness(0) invert(1) sepia(100%) saturate(1000%) hue-rotate(30deg) brightness(1.2)', // Aplica el color ámbar a la imagen negra si fuera necesaria
                ...style
            }}
            onError={(e) => {
                // Fallback genérico a un cuadrado en caso de que aún no exista la imagen logo.png
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23eab308' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/%3E%3Cpolyline points='22 4 12 14.01 9 11.01'/%3E%3C/svg%3E";
                e.target.style.filter = "none";
            }}
        />
    );
}
