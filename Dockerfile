# ==========================================
# STAGE 1: Build Vite React Frontend (PWA)
# ==========================================
FROM node:22-slim AS frontend-builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend (outputs to dist/)
RUN pnpm build


# ==========================================
# STAGE 2: Build Next.js Website
# ==========================================
FROM node:22-slim AS website-builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy website package files
COPY website/package.json website/pnpm-lock.yaml ./

# Install dependencies (ignore build scripts for native modules)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy website source (entire website directory)
COPY website/ ./

# Build Next.js (outputs to .next/standalone/)
RUN pnpm run build


# ==========================================
# STAGE 3: Runtime - Python + Nginx + Supervisor (PostgreSQL via DBaaS)
# ==========================================
FROM python:3.12-slim AS runtime

# Install system dependencies (no PostgreSQL - using external DBaaS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy Node.js from builder for Next.js standalone
COPY --from=frontend-builder /usr/local/bin/node /usr/local/bin/node

# Create app directories
RUN mkdir -p /srv/frontend /srv/backend /srv/website /var/log/supervisor /var/log/nginx /run/nginx

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist/ /srv/frontend/

# Copy backend source code
COPY backend/ /srv/backend/

# Copy built Next.js standalone output from builder stage
COPY --from=website-builder /app/.next/standalone/ /srv/website/
COPY --from=website-builder /app/.next/ /srv/website/.next/
COPY --from=website-builder /app/public/ /srv/website/public/

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Install Python dependencies
WORKDIR /srv/backend
RUN pip install --no-cache-dir -r requirements.txt

# Install gunicorn
RUN pip install --no-cache-dir gunicorn

# Create Django static/media directories
RUN mkdir -p /srv/backend/static /srv/backend/media

# Collect static files (optional, for Django admin)
RUN python manage.py collectstatic --noinput --settings=Sefro_Clinic.settings 2>/dev/null || true

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose port 80 (Liara will route HTTP traffic here)
EXPOSE 80

# Run startup script
CMD ["/start.sh"]