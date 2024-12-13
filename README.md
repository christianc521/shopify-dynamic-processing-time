# Shopify Dynamic Processing Time

Over this past summer, I've been working a personal project that combines lamps with embedded development using motorized shades _(that's for a later post)_. I knew that I would eventually want to sell these, but was worried about the varying processing times for these as each lamp would need to be printed, flashed, and assembled. The most popular e-commerce platform, [Shopify](https://www.shopify.com/), does not provide the functionality for merchants to provide custom processing times to list on product pages. After doing market research, I found that many shops face this issue as many products sold from small businesses are handmade and made to order. Seeing this gap in the market, I decided to develop my own [embedded Shopify application](https://shopify.dev/docs/apps/build) to tackle this common issue.

![image](https://github.com/user-attachments/assets/1aa795a6-138b-4101-bbcf-e567652ed624)

Through a merchant view, they would install the app from the Shopify app store and access the actions from the admin panel. From here, all the merchant would have to do is set the assembly time in hours for each product. In the page builder, an [app block](https://help.shopify.com/en/manual/online-store/themes/theme-structure/extend/apps#app-blocks) displaying the current processing time would be available. The text in the block dynamically changes based on the amount of unfilled orders at the time the page is opened.  

The frontend is built using the full stack web framework, [Remix](https://remix.run/). I needed to develop an API to communicate with Shopify services, so I decided to use [Prisma](https://www.prisma.io/) to store session data and [GraphQL](https://graphql.org/) for all queries and mutations. Webhooks triggered all database modifications, allowing all backend changes to occur automatically. My API authenticates with each individual shop admin session before any database changes are made. 

![image](https://github.com/user-attachments/assets/1ff09658-933c-42c3-9b92-3a1fe8b01feb)

Shopify uses the robust template language, [Liquid](https://shopify.dev/docs/api/liquid), that can dynamically insert information, including product metafields, to display static content within a webpage. I used this to load the current processing time for the product listed on the page.

![image](https://github.com/user-attachments/assets/15442cc9-967c-4362-a0de-6fb9c554bee9)
