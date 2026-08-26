// El "declare module '*.css'" que ya trae vite/client (ver tsconfig.app.json)
// solo matchea imports que terminan en ".css". @fontsource/big-shoulders-display
// es el único de los tres paquetes de fuentes que NO expone la variante de
// export "./*.css" (ver el comentario en main.tsx): hay que importarlo sin la
// extensión, y por eso necesita su propia declaración acá.
declare module "@fontsource/big-shoulders-display/700";
