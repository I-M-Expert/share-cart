import shopify from '../../shopify.js'
export const fetchProducts = async (req, res) => {

    const session = res.locals.shopify.session;
    const shop = session.shop;

    const client = new shopify.api.clients.Graphql({ session });
    const data = await client.query({
      data: `query {
    products(first: 250) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }`,
    });

    res.status(200).json({
      success: true,
      products: data.body.data.products.edges.map((edge) => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
      })),
    });
}