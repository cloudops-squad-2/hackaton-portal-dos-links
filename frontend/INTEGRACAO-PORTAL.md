# Repasse para integração ao Portal dos Links

Este frontend pode ser incorporado à pasta `frontend/` do repositório principal. Ele não contém nem precisa conter o banco de dados.

**O que já foi preparado:** React + TypeScript + Vite; interface responsiva com a Dra. Miúda; formulário, listagem e conquistas; Dockerfile multi-stage; nginx na porta 80; `/health` do servidor estático; testes locais sem serviços externos.

**Para quem cuida da API:** a interface envia `POST /api/links` com `url` e `expiresIn` opcional; solicita `GET /api/links?page=N`. Foi identificado que o DTO enviado ainda não converte `limit` para número, por isso o frontend não transmite esse parâmetro. Os campos Micro, Nano, nome do experimento, final personalizado, expiração em data específica e limite de acessos ainda precisam de confirmação ou implementação.

**Para quem cuida do GitOps:** o serviço web escuta na porta 80. É preciso encaminhar `/api/*` à API e o caminho `/:code` ao redirecionador do backend. Definir a origem pública dos links no build (`VITE_PUBLIC_BASE_URL`), assim como o destino das imagens GHCR. O `nginx.conf` entregue não possui proxy `/api` ativo; o Ingress deve assumir essa responsabilidade ou a configuração deve ser alinhada antes da implantação.

**Para quem cuida de observabilidade:** `src/telemetry/otel.ts` é um ponto de extensão, não uma instrumentação OpenTelemetry em produção. O backend e o browser precisam propagar contexto de trace, e o Collector deve oferecer OTLP/HTTP com CORS para a origem do site. Também será necessário garantir que o endereço original da URL e possíveis tokens não sejam exportados nos spans.

**CI:** existe um workflow na raiz do Portal. Recomenda-se inserir `npm ci`, `npm test`, `npm run lint` e `npm run build` com `working-directory: frontend` como etapa obrigatória antes de publicar a imagem `frontend`. Não copiar por cima do workflow dos colegas.

**Limite dos testes locais:** a tela sem API mostra uma indisponibilidade esperada. Precisamos executar juntos a sequência criar → copiar → abrir → contar clique → atualizar a listagem e, depois, verificar a implantação e os traces. Isso depende do ambiente da equipe, não de mais alterações estéticas.

## QR Code e CI (revisão de integração)

- O histórico agora permite copiar o link e visualizar seu QR Code sem serviço externo.
- O gerador está em `src/utils/qrCode.js`, com atribuição de licença em `src/utils/QR-LICENSES.txt`.
- Copiar `frontend/` para a raiz do repositório da aplicação. Não copiar `node_modules/`, `dist/` ou variáveis privadas.
- No workflow `.github/workflows/ci.yml` do application repo, o job `test-frontend` executa `npm ci`, `npm test`, `npm run lint` e `npm run build`. O job `build` depende dele.
- A telemetria do navegador ainda é um placeholder. O requisito `REQ-FE-06` depende de implementação do OpenTelemetry browser SDK e de endpoint do Collector acessível pelo navegador com CORS permitido; não marcar como concluído.
- A publicação completa ainda depende da atualização do config repo pelo CI e das configurações de Ingress `/api` e `/:code`.
