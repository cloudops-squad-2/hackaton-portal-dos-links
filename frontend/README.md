# Encolhe! — Laboratório da Dra. Miúda

Frontend do encurtador de links desenvolvido para o Hackathon CloudOps. O projeto usa a ideia de um laboratório: a Dra. Miúda opera o Raio Encolhedor, e cada link criado é tratado como um experimento.

A interface foi feita em **React, TypeScript, Vite e CSS**, sem biblioteca de componentes, fontes remotas ou serviço pago. A mascote é um SVG local e as animações usam CSS.

## Rodar no computador

É necessário ter Node.js 22 e npm.

```bash
npm ci
npm run dev
```

Abra o endereço indicado pelo Vite, normalmente `http://localhost:5173/`. O formulário e a interface carregam sem a API, mas a criação e a listagem reais dependem do backend. O Vite encaminha chamadas `/api` para `http://localhost:3000` em desenvolvimento.

Para verificar antes de publicar:

```bash
npm test
npm run lint
npm run build
```

No Windows, `verificar-antes-de-enviar.cmd` executa `npm ci`, os testes, o lint e o build em sequência. Se algum comando falhar, o script interrompe a verificação.

## Funcionalidades

O formulário valida URLs HTTP/HTTPS, envia pedidos de criação, mostra o link retornado, permite copiar e abrir e avisa quando ocorre algum erro. A listagem apresenta pesquisa, ordenação e paginação. Os indicadores e o ranking são calculados somente com os dados que a API efetivamente retornou. As conquistas ficam guardadas neste navegador; a dica do dia é local e não depende de serviços externos.

A versão conhecida da API gera códigos de **7 caracteres** e aceita `url` e, opcionalmente, `expiresIn` em segundos. Modos Micro e Nano, nome, código personalizado, data específica e limite de acessos aparecem na interface, mas bloqueiam o envio quando selecionados: ainda não há suporte confirmado no backend.

## Contrato usado pelo frontend

| Operação | Rota | Dados |
|---|---|---|
| Criar link | `POST /api/links` | `{ "url": "https://...", "expiresIn": 86400 }` (`expiresIn` é opcional) |
| Listar links | `GET /api/links?page=1` | `{ "data": [...], "meta": { "total", "page", "limit", "totalPages" } }` |
| Abrir link curto | `GET /:code` | Redirecionamento tratado pelo backend |
| Verificar a API | `GET /api/health` | Resposta de saúde da API |

A listagem solicita apenas `page` por compatibilidade com a versão do backend recebida: o DTO ainda não converte `limit` para número antes da validação. O backend utiliza seu limite padrão. Pesquisa, ordenação e ranking operam **sobre a página carregada**, não sobre todos os links do banco.

## Configuração e implantação

- `VITE_API_BASE_URL`: prefixo opcional para chamadas à API; vazio significa usar `/api` na mesma origem. Em produção é preciso encaminhar essa rota pelo Ingress ou proxy.
- `VITE_PUBLIC_BASE_URL`: endereço público usado na construção dos links curtos; deve apontar para uma origem que envie `/:code` ao backend.
- `VITE_OTEL_ENABLED`, `VITE_OTEL_EXPORTER_URL` e `VITE_OTEL_SERVICE_NAME`: reservadas para integração futura. **O frontend ainda não exporta traces OpenTelemetry.**

Variáveis `VITE_*` são incorporadas **durante o build** e ficam visíveis no navegador. Não use essas variáveis para senhas, tokens ou credenciais. O banco PostgreSQL e a variável `DATABASE_URL` pertencem à API.

O `Dockerfile` tem dois estágios (Node para compilação e nginx para servir o resultado), expõe a porta **80** e oferece `GET /health`. Esse endpoint verifica o servidor estático, não a saúde da API. O `nginx.conf` não encaminha `/api` por padrão: a infraestrutura precisa definir o roteamento. `/:code` também deve chegar ao backend, não ao fallback da SPA.

### Como enviar ao Portal

Coloque esta pasta em `frontend/` no repositório compartilhado, sem `node_modules`, `dist` ou arquivos `.env.local`. O Portal já tem um workflow na raiz para construir `api/` e `frontend/`. O GitHub Actions **não** executa automaticamente workflows localizados em `frontend/.github/workflows/` — por isso o CI da equipe deve continuar na raiz e receber os testes do frontend antes de publicar a imagem.

Antes da demonstração, combinar com os responsáveis as rotas, o domínio público, o Collector e as imagens Docker. O frontend isolado **não comprova** que o sistema está funcionando em Kubernetes, ArgoCD ou Grafana.

## Como usamos o Kiro

O planejamento do frontend foi registrado em `.kiro/specs/encolhe-frontend/`, com requisitos, design, tarefas e notas de integração. O Kiro ajudou a organizar os componentes e a implementar o formulário, a experiência visual e os arquivos de entrega. Depois, revisamos o código para corrigir a comunicação das conquistas, preservar campos ainda não suportados e evitar dados de demonstração apresentados como reais.

As decisões mais relevantes foram usar CSS e SVG locais para manter o pacote leve, bloquear no formulário recursos que o backend ainda não aceita e separar o health check do frontend do health check da API. A validação final precisa ser feita com os serviços integrados.


## Conferência visual

Com `npm run dev`, abra `http://localhost:5173/`. Para verificar o tamanho real
da interface, use `Ctrl + 0` no navegador (zoom de 100%). A visualização responsiva
pode ser aberta pelo menu do navegador em **Mais ferramentas > Ferramentas do
desenvolvedor** e, em seguida, pela opção de dispositivo móvel.
