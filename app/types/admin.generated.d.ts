/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type ProductsQueryVariables = AdminTypes.Exact<{
  first: AdminTypes.Scalars['Int']['input'];
}>;


export type ProductsQuery = { products: { nodes: Array<Pick<AdminTypes.Product, 'id' | 'title'>> } };

export type PopulateProductMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.ProductInput;
}>;


export type PopulateProductMutation = { productCreate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<(
      Pick<AdminTypes.Product, 'id' | 'title' | 'handle' | 'status'>
      & { variants: { edges: Array<{ node: Pick<AdminTypes.ProductVariant, 'id' | 'price' | 'barcode' | 'createdAt'> }> } }
    )> }> };

export type ShopifyRemixTemplateUpdateVariantMutationVariables = AdminTypes.Exact<{
  productId: AdminTypes.Scalars['ID']['input'];
  variants: Array<AdminTypes.ProductVariantsBulkInput> | AdminTypes.ProductVariantsBulkInput;
}>;


export type ShopifyRemixTemplateUpdateVariantMutation = { productVariantsBulkUpdate?: AdminTypes.Maybe<{ productVariants?: AdminTypes.Maybe<Array<Pick<AdminTypes.ProductVariant, 'id' | 'price' | 'barcode' | 'createdAt'>>> }> };

export type GetProductsQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type GetProductsQuery = { products: { edges: Array<{ node: Pick<AdminTypes.Product, 'id' | 'title'> }> } };

export type GetUnfulfilledOrdersQueryVariables = AdminTypes.Exact<{
  query: AdminTypes.Scalars['String']['input'];
}>;


export type GetUnfulfilledOrdersQuery = { orders: { edges: Array<{ node: (
        Pick<AdminTypes.Order, 'id'>
        & { lineItems: { edges: Array<{ node: (
              Pick<AdminTypes.LineItem, 'quantity' | 'fulfillableQuantity'>
              & { product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id'>> }
            ) }> } }
      ) }> } };

export type MetafieldsSetProcessingMutationVariables = AdminTypes.Exact<{
  metafields: Array<AdminTypes.MetafieldsSetInput> | AdminTypes.MetafieldsSetInput;
}>;


export type MetafieldsSetProcessingMutation = { metafieldsSet?: AdminTypes.Maybe<{ metafields?: AdminTypes.Maybe<Array<Pick<AdminTypes.Metafield, 'id' | 'value'>>>, userErrors: Array<Pick<AdminTypes.MetafieldsSetUserError, 'field' | 'message'>> }> };

interface GeneratedQueryTypes {
  "#graphql\n    query products($first: Int!) {\n      products(first: $first) {\n        nodes {\n          id\n          title\n        }\n      }\n    }\n    ": {return: ProductsQuery, variables: ProductsQueryVariables},
  "\n  #graphql\n  query getProducts {\n    products (first: 3) {\n      edges {\n        node {\n          id\n          title\n        }\n      }\n    }\n  }\n": {return: GetProductsQuery, variables: GetProductsQueryVariables},
  "\n  #graphql\n  query GetUnfulfilledOrders($query: String!) {\n    orders(query: $query, first: 100) {\n      edges {\n        node {\n          id\n          lineItems(first: 100) {\n            edges {\n              node {\n                product {\n                  id\n                }\n                quantity\n                fulfillableQuantity\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": {return: GetUnfulfilledOrdersQuery, variables: GetUnfulfilledOrdersQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n      mutation populateProduct($input: ProductInput!) {\n        productCreate(input: $input) {\n          product {\n            id\n            title\n            handle\n            status\n            variants(first: 10) {\n              edges {\n                node {\n                  id\n                  price\n                  barcode\n                  createdAt\n                }\n              }\n            }\n          }\n        }\n      }": {return: PopulateProductMutation, variables: PopulateProductMutationVariables},
  "#graphql\n    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {\n      productVariantsBulkUpdate(productId: $productId, variants: $variants) {\n        productVariants {\n          id\n          price\n          barcode\n          createdAt\n        }\n      }\n    }": {return: ShopifyRemixTemplateUpdateVariantMutation, variables: ShopifyRemixTemplateUpdateVariantMutationVariables},
  "\n  #graphql\n  mutation MetafieldsSetProcessing($metafields: [MetafieldsSetInput!]!) {\n    metafieldsSet(metafields: $metafields) {\n      metafields {\n        id\n        value\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: MetafieldsSetProcessingMutation, variables: MetafieldsSetProcessingMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
