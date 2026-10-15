# ── Dockerfile — Encolhe! Frontend ────────────────────────────────────────
#
# Build em dois estágios:
#   1. builder  — instala dependências e compila o bundle Vite
#   2. runtime  — nginx:alpine serve os arquivos estáticos resultantes
#
# Variáveis VITE_* são gravadas no bundle durante o build (estágio 1).
# Para alterar VITE_API_BASE_URL ou VITE_PUBLIC_BASE_URL em produção,
# passe-as como --build-arg ao executar `docker build`.
#
# Pendências de definição com a equipe (D6):
#   - Porta de produção e domínio real (VITE_PUBLIC_BASE_URL)
#   - Estratégia de reverse proxy (/api e /:code — veja nginx.conf)
#   - Registry de imagens e tag de versão
# ──────────────────────────────────────────────────────────────────────────

# ── Estágio 1: build ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copia manifesto de dependências primeiro para aproveitar cache de layer
COPY package.json package-lock.json ./

# Instala dependências exatamente conforme lock file (sem alterar)
RUN npm ci --ignore-scripts

# Copia o restante do código
COPY . .

# Argumentos de build para variáveis Vite (incorporadas ao bundle)
# Sobrescreva conforme o ambiente: --build-arg VITE_PUBLIC_BASE_URL=https://seu-dominio.com
ARG VITE_API_BASE_URL=""
ARG VITE_PUBLIC_BASE_URL=""

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_BASE_URL=$VITE_PUBLIC_BASE_URL

RUN npm run build

# ── Estágio 2: runtime ─────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove a configuração padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia configuração customizada (SPA fallback + proxy /api)
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copia o bundle gerado pelo Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Healthcheck simples: verifica se o nginx responde na porta 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
