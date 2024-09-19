import { LoaderFunction, json } from "@remix-run/node";
import { useLoaderData } from '@remix-run/react';
import shopify, { authenticate } from "app/shopify.server";

// Define the Product interface
interface Product {
  id: string;
  title: string;
}

// Define the GraphQL Response interface
interface ShopifyGraphQLResponse {
  data: {
    products: {
      nodes: Product[];
    };
  };
}

export const loader: LoaderFunction = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Make the GraphQL request with correct types
  const response: ShopifyGraphQLResponse = await admin.graphql(
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
    { variables: { first: 5 } } // Fetch 5 products as an example
  );

  // Extract the products from the response
  const products = response;

  // Log for debugging purposes
  console.log('products: ', json({ products }));

  // Return the products as JSON for the frontend
  return products;
};

export default function AssemblyTimeForm() {
  // Use the loader data and type it as an array of products
  const { products } = useLoaderData<{ products: Product[] }>();

  // Check if products is defined and is an array
  if (!products || products.length === 0) {
    return <p>No products available.</p>;
  }

  return (
    <div>
      <h1>Set Assembly Time for Products</h1>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <h2>{product.title}</h2>
          </li>
        ))}
      </ul>
    </div>
  );
}
