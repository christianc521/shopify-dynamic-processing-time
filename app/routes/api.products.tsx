import { LoaderFunction } from "@remix-run/node";
import shopify, { authenticate } from "app/shopify.server";

export const loader: LoaderFunction = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query products($first: Int!) {
      products(first: $first) {
        nodes {
          id
          title
        }
      }
    }
    `,
    {variables : {first: 1}}
  );
  const body = await response;
  console.log('products: ', body)
  console.log(body.data?.products?.nodes[0].title);
};

