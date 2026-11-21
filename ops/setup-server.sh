#!/usr/bin/env bash
# One-time setup for FreakyTimes on the OVH server that already runs Blazed Kitty. Safe to run again.
#
#   curl -fsSL https://raw.githubusercontent.com/dev-perceptric/freaky-times/main/ops/setup-server.sh | sudo bash
#
# What it does:
#   1. Finds the running Blazed Kitty container and copies how it is wired up (Traefik labels, Caddy or nginx).
#   2. Creates /docker/freaky-times with docker-compose.yml and .env (keeps an existing .env).
#      Copies the AliExpress, CJ and Resend keys from Blazed Kitty's .env, makes a new ADMIN_TOKEN,
#      and leaves Stripe empty (FreakyTimes needs its own Stripe account).
#   3. Adds freakytimes.com and www.freakytimes.com to the same reverse proxy, with a backup and a config test first.
#   4. Starts the store and checks it answers.
# The server's autodeploy container then keeps it updated after every push to main.
set -euo pipefail

APP=/docker/freaky-times
DOMAIN=freakytimes.com
IMAGE=ghcr.io/dev-perceptric/freaky-times:latest
RAW=https://raw.githubusercontent.com/dev-perceptric/freaky-times/main
STAMP=$(date +%Y%m%d-%H%M%S)

say()  { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '    \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31mStopped: %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "run it with sudo"
command -v docker >/dev/null || die "docker is not installed on this machine"

# ---------- 1. Blazed Kitty ----------
say "Looking at how Blazed Kitty runs"
BK_CID=$(docker ps --filter "ancestor=ghcr.io/dev-perceptric/blazed-kitty:latest" -q | head -1)
[ -n "$BK_CID" ] || BK_CID=$(docker ps --format '{{.ID}} {{.Image}}' | awk '/blazed-kitty/ {print $1; exit}')
[ -n "$BK_CID" ] || die "couldn't find a running Blazed Kitty container"
BK_NAME=$(docker inspect -f '{{.Name}}' "$BK_CID" | sed 's#^/##')
BK_DIR=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$BK_CID" 2>/dev/null || true)
[ "$BK_DIR" = "<no value>" ] && BK_DIR=
BK_PORT=$(docker inspect -f '{{range $p, $b := .HostConfig.PortBindings}}{{range $b}}{{.HostPort}} {{end}}{{end}}' "$BK_CID" | awk '{print $1}')
BK_NETS=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$BK_CID")
ok "container: $BK_NAME"
ok "folder: ${BK_DIR:-unknown}"
ok "host port: ${BK_PORT:-none}"
ok "networks: $BK_NETS"

# Where Blazed Kitty keeps its AliExpress sign-in (/app/data). FreakyTimes reads it read-only, so both stores share
# one AliExpress app: an account only gets one dropshipping app, and signing in twice could cancel the first sign-in.
BK_DATA=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{if .Name}}vol:{{.Name}}{{else}}bind:{{.Source}}{{end}}{{end}}{{end}}' "$BK_CID")
if [ -n "$BK_DATA" ] && docker exec "$BK_CID" test -f /app/data/aliexpress.json 2>/dev/null; then
  ok "AliExpress sign-in: shared from Blazed Kitty (${BK_DATA#*:})"
else
  warn "Blazed Kitty has no saved AliExpress sign-in to share yet"
  BK_DATA=""
fi

# Networks shared with a proxy (anything that isn't Blazed Kitty's own default network).
BK_PROJECT=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$BK_CID" 2>/dev/null || true)
[ "$BK_PROJECT" = "<no value>" ] && BK_PROJECT=
SHARED_NETS=""
for n in $BK_NETS; do
  [ "$n" = "${BK_PROJECT}_default" ] && continue
  [ "$n" = "bridge" ] && continue
  SHARED_NETS="$SHARED_NETS $n"
done

# ---------- 2. Which proxy ----------
PROXY=none
TRAEFIK_LABELS=$(docker inspect -f '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' "$BK_CID" | grep '^traefik\.' || true)
CADDYFILE=""; NGINX_CONF=""
if [ -n "$TRAEFIK_LABELS" ]; then
  PROXY=traefik
else
  for f in /etc/caddy/Caddyfile /docker/*/Caddyfile /opt/*/Caddyfile /docker/*/caddy/Caddyfile /opt/*/caddy/Caddyfile; do
    [ -f "$f" ] && grep -q 'blazedkitty.com' "$f" && { CADDYFILE=$f; PROXY=caddy; break; }
  done
  if [ "$PROXY" = none ]; then
    NGINX_CONF=$(grep -rlsE 'server_name[^;]*blazedkitty\.com' /etc/nginx /docker/*/nginx /opt/*/nginx 2>/dev/null | head -1 || true)
    [ -n "$NGINX_CONF" ] && PROXY=nginx
  fi
fi
say "Reverse proxy: $PROXY"

# A free port on 127.0.0.1 (only used for Caddy/nginx running on the host).
pick_port() {
  local p=3001
  while ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$p\$"; do p=$((p + 1)); done
  echo "$p"
}
PORT=$(pick_port)

# ---------- 3. Folder, compose and .env ----------
say "Writing $APP"
mkdir -p "$APP"
cd "$APP"

if [ -f .env ]; then
  ok ".env already exists, keeping it"
else
  curl -fsSL "$RAW/.env.example" -o .env
  set_env() {
    local v; v=$(printf '%s' "$2" | sed 's/[&|\\]/\\&/g')
    if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$v|" .env; else printf '%s=%s\n' "$1" "$2" >> .env; fi
  }
  set_env ADMIN_TOKEN "$(openssl rand -hex 24)"
  set_env NEXT_PUBLIC_SITE_URL "https://$DOMAIN"
  BK_ENV=""
  [ -n "$BK_DIR" ] && [ -f "$BK_DIR/.env" ] && BK_ENV="$BK_DIR/.env"
  if [ -n "$BK_ENV" ]; then
    for k in ALIEXPRESS_APP_KEY ALIEXPRESS_APP_SECRET CJ_API_KEY RESEND_API_KEY; do
      v=$(grep -E "^$k=" "$BK_ENV" | head -1 | cut -d= -f2- || true)
      [ -n "$v" ] && { set_env "$k" "$v"; ok "copied $k from Blazed Kitty"; }
    done
  else
    warn "couldn't find Blazed Kitty's .env, so no keys were copied"
  fi
  chmod 600 .env
  ok "made .env with a new ADMIN_TOKEN"
fi

{
  echo "# FreakyTimes. Written by ops/setup-server.sh on $STAMP."
  echo "services:"
  echo "  web:"
  echo "    image: $IMAGE"
  echo "    container_name: freaky-times"
  echo "    restart: unless-stopped"
  echo "    env_file: .env"
  echo "    environment:"
  echo "      - NEXT_PUBLIC_SITE_URL=https://$DOMAIN"
  echo "      - DATA_DIR=/app/data"
  if [ -n "$BK_DATA" ]; then
    echo "      - ALIEXPRESS_TOKEN_FILE=/app/ae-shared/aliexpress.json"
    echo "      - ALIEXPRESS_TOKEN_READONLY=true"
  fi
  echo "    volumes:"
  echo "      - ft-data:/app/data"
  case "$BK_DATA" in
    vol:*) echo "      - bk-data:/app/ae-shared:ro" ;;
    bind:*) echo "      - ${BK_DATA#bind:}:/app/ae-shared:ro" ;;
  esac
  if [ "$PROXY" = traefik ]; then
    echo "    labels:"
    echo "$TRAEFIK_LABELS" | while IFS= read -r line; do
      [ -z "$line" ] && continue
      # Domain first, then router and service names. "$" is doubled so compose doesn't read it as a variable.
      line=$(printf '%s' "$line" | sed -E "s/blazedkitty\\.com/$DOMAIN/g; s/blazed[-_]kitty/freaky-times/g; s/blazedkitty/freakytimes/g; s/\\$/\$\$/g; s/\"/\\\\\"/g")
      printf '      - "%s"\n' "$line"
    done
  elif [ -n "$BK_PORT" ] || [ "$PROXY" = caddy ] || [ "$PROXY" = nginx ]; then
    echo "    ports:"
    echo "      - \"127.0.0.1:$PORT:3000\""
  fi
  if [ -n "$SHARED_NETS" ]; then
    echo "    networks:"
    for n in $SHARED_NETS; do echo "      - $n"; done
    echo "      - default"
  fi
  echo "    logging:"
  echo "      driver: json-file"
  echo "      options: { max-size: 10m, max-file: \"3\" }"
  echo "volumes:"
  echo "  ft-data: {}"
  case "$BK_DATA" in vol:*) echo "  bk-data: { external: true, name: ${BK_DATA#vol:} }" ;; esac
  if [ -n "$SHARED_NETS" ]; then
    echo "networks:"
    for n in $SHARED_NETS; do echo "  $n: { external: true }"; done
  fi
} > docker-compose.yml
ok "wrote docker-compose.yml"
[ "$PROXY" = traefik ] && grep -q 'Host(' docker-compose.yml && ok "Traefik rule: $(grep -o 'Host([^)]*)[^"]*' docker-compose.yml | head -1)"

# ---------- 4. Start ----------
say "Starting FreakyTimes"
docker compose pull -q
docker compose up -d
for i in $(seq 1 30); do
  st=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' freaky-times 2>/dev/null || echo starting)
  [ "$st" = healthy ] && break
  sleep 2
done
ok "container status: $st"

# ---------- 5. Proxy ----------
say "Connecting $DOMAIN to the store"
case "$PROXY" in
  traefik)
    ok "Traefik picks up the labels on its own"
    ;;
  caddy)
    if grep -q "$DOMAIN" "$CADDYFILE"; then
      ok "$DOMAIN is already in $CADDYFILE"
    else
      cp "$CADDYFILE" "$CADDYFILE.bak-$STAMP"
      # Copy Blazed Kitty's site block and point it at FreakyTimes.
      BLOCK=$(awk '/blazedkitty\.com/ && /\{/ {f=1} f {print} f && /^\}/ {exit}' "$CADDYFILE")
      if echo "$BLOCK" | grep -qE "reverse_proxy +$BK_NAME:"; then TARGET="freaky-times:3000"; else TARGET="127.0.0.1:$PORT"; fi
      NEW=$(echo "$BLOCK" | sed -E "s/(www\.)?blazedkitty\.com/\1$DOMAIN/g; s#reverse_proxy +[^ ]+#reverse_proxy $TARGET#")
      [ -n "$NEW" ] || NEW=$(printf '%s, www.%s {\n\treverse_proxy %s\n}' "$DOMAIN" "$DOMAIN" "$TARGET")
      printf '\n%s\n' "$NEW" >> "$CADDYFILE"
      CADDY_C=$(docker ps --format '{{.Names}} {{.Image}}' | awk '/caddy/ {print $1; exit}')
      if [ -n "$CADDY_C" ]; then
        docker exec "$CADDY_C" caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 && docker exec "$CADDY_C" caddy reload --config /etc/caddy/Caddyfile \
          || { cp "$CADDYFILE.bak-$STAMP" "$CADDYFILE"; die "Caddy didn't accept the new config, so it was put back"; }
      else
        caddy validate --config "$CADDYFILE" >/dev/null 2>&1 && systemctl reload caddy \
          || { cp "$CADDYFILE.bak-$STAMP" "$CADDYFILE"; die "Caddy didn't accept the new config, so it was put back"; }
      fi
      ok "added $DOMAIN to $CADDYFILE and reloaded Caddy"
    fi
    ;;
  nginx)
    DIR=$(dirname "$NGINX_CONF")
    command -v nginx >/dev/null || die "nginx runs in a container here; send Claude the output of: docker ps"
    EXT=""; [[ "$NGINX_CONF" == *.conf ]] && EXT=.conf
    NEW_CONF="$DIR/freakytimes.com$EXT"
    if [ -f "$NEW_CONF" ]; then
      ok "$NEW_CONF already exists"
    else
      sed -E "s/blazedkitty\.com/$DOMAIN/g; s#(proxy_pass +http://(127\.0\.0\.1|localhost)):${BK_PORT:-3000}#\1:$PORT#g; s#proxy_pass +http://$BK_NAME:3000#proxy_pass http://127.0.0.1:$PORT#g" "$NGINX_CONF" > "$NEW_CONF"
      # Certificates for blazedkitty.com don't cover freakytimes.com: drop those lines unless certbot can make new ones.
      sed -i -E '/ssl_certificate|listen .*443|include .*options-ssl|ssl_dhparam/d' "$NEW_CONF"
      if grep -q 'ssl_certificate' "$NGINX_CONF" && ! command -v certbot >/dev/null; then
        warn "certbot isn't installed, so the site answers on port 80 (set Cloudflare SSL to Flexible)"
      fi
      [[ "$DIR" == */sites-available ]] && ln -sf "$NEW_CONF" /etc/nginx/sites-enabled/
      if nginx -t >/dev/null 2>&1; then
        systemctl reload nginx
        ok "added $NEW_CONF and reloaded nginx"
        if command -v certbot >/dev/null && grep -q 'ssl_certificate' "$NGINX_CONF"; then
          certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
            && ok "made an HTTPS certificate with certbot" || warn "certbot couldn't make a certificate; set Cloudflare SSL to Flexible for now"
        fi
      else
        rm -f "$NEW_CONF" "/etc/nginx/sites-enabled/$(basename "$NEW_CONF")"
        die "nginx didn't accept the new config, so it was removed (nginx -t shows why)"
      fi
    fi
    ;;
  none)
    warn "couldn't tell how blazedkitty.com reaches its container."
    warn "FreakyTimes is running on 127.0.0.1:$PORT. Send these lines to Claude:"
    docker ps --format '    {{.Names}}  {{.Image}}  {{.Ports}}'
    ;;
esac

# ---------- 6. Check ----------
say "Checking"
if grep -q "127.0.0.1:$PORT:3000" docker-compose.yml; then
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)
else
  code=$(docker exec freaky-times wget -qO- --server-response http://127.0.0.1:3000/ 2>&1 | awk '/HTTP\//{print $2; exit}' || true)
fi
ok "store answers inside the server: ${code:-no answer}"
code2=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" http://127.0.0.1/ || true)
ok "proxy answers for $DOMAIN on port 80: ${code2:-no answer}"

if [ -n "$BK_DATA" ]; then
  ae=$(docker exec freaky-times wget -qO- --header "X-Admin-Token: $(grep -E '^ADMIN_TOKEN=' "$APP/.env" | cut -d= -f2-)" http://127.0.0.1:3000/api/aliexpress/admin 2>/dev/null || true)
  case "$ae" in *'"connected":true'*) ok "AliExpress: connected through Blazed Kitty's sign-in" ;; *) warn "AliExpress check said: ${ae:-no answer}" ;; esac
fi

TOKEN=$(grep -E '^ADMIN_TOKEN=' "$APP/.env" | cut -d= -f2-)
cat <<EOF

Done.
  Store folder:   $APP
  Admin token:    $TOKEN   (keep this private)
  Import list:    https://$DOMAIN/admin/queue
  AliExpress:     $( [ -n "$BK_DATA" ] && echo "shared with Blazed Kitty, nothing to do" || echo "https://$DOMAIN/api/aliexpress/connect?key=$TOKEN" )
  Still to add:   STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in $APP/.env, then: cd $APP && sudo docker compose up -d
EOF
