# Culto Salgados — site público

Site estático responsivo preparado para GitHub Pages, com identidade preta e dourada, cardápio, tamanhos/preços provisórios e leitura do estoque pelo Firebase Firestore.

## Arquivos principais
- `index.html`: estrutura e textos.
- `style.css`: cores, layout e responsividade.
- `app.js`: preços visíveis no HTML e consulta pública ao estoque Firebase.
- `assets/`: imagens fornecidas para o projeto.

## Como alterar os preços
Abra `index.html`, procure `R$ 99,99` e troque os três valores dos cartões Mini Big, Big e BigBig. São valores provisórios.

## Como publicar no GitHub Pages
1. Crie um repositório no GitHub (por exemplo, `culto-salgados-site`).
2. Envie todos os arquivos e a pasta `assets` para a raiz do repositório.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**, escolha `main` e `/ (root)` e salve.
5. Aguarde a publicação e abra a URL apresentada pelo GitHub Pages.

## Estoque ao vivo (Firebase)
O site lê somente `empresas/W2OxRO5cnIgfhG6CS5BqlwPH0o13/estoque`. O mapeamento de categorias normaliza acentos e reconhece nomes compostos, como 'Coxinha de frango', por palavras-chave:
- Coxinhas: `coxinha`, `mini coxinha`, `coxinhas`
- Risoles: `risole`, `risoles`, `mini risoles`
- Pastelzinhos: `pastelzinho`, `pastel`, `mini pastelzinho`, `mini pastel`

As quantidades dos documentos correspondentes são somadas. Se a coleção estiver vazia ou os nomes não forem reconhecidos, o cardápio mostra um aviso; os detalhes de diagnóstico aparecem no console do navegador (F12 → Console). A chave de configuração do Firebase no frontend é identificador público do app; as permissões devem ser controladas pelas regras do Firestore. Antes de publicar, revise as regras para permitir leitura pública **somente** dos dados necessários desta empresa e impedir acesso público a vendas, gastos, documentos de outras empresas ou campos privados. Uma regra `allow read: if true` em caminhos amplos pode expor mais dados do que o site precisa.

## Verificação
A consulta de estoque é executada no navegador quando a página abre e também pelo botão “Atualizar estoque”. Se a leitura for negada ou a rede falhar, o site mostra indisponibilidade em vez de inventar números. Não foi possível validar a leitura real nem publicar diretamente no GitHub a partir deste pacote; teste no domínio publicado e confirme as regras do Firestore.


## Pedidos
O formulário salva documentos na coleção `pedidos` do projeto Firebase `cardapio-7bca4`. O telefone não é solicitado. O formulário exige nome e ao menos um copo. Os preços são armazenados em centavos para evitar erros de arredondamento. A página de acompanhamento está no ZIP separado `PedidosCultoSalgados.zip`.

**Aviso de segurança:** as regras públicas que permitem leitura, criação, alteração e exclusão de todos os documentos deixam o banco inteiro vulnerável. Use esse projeto apenas com dados que aceita tornar públicos e saiba que qualquer visitante pode manipular pedidos.
