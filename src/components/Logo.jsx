export function Logo({ style = {}, className = "" }) {
    return (
        <img
            src="/logo_pegasus.png"
            alt="Transporte Hidalgo Logo"
            className={className}
            style={{
                objectFit: 'contain',
                ...style
            }}
        />
    );
}
