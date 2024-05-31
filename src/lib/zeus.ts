import { Chain } from "../../generated/zeus";

const zeusChain = Chain(process.env.NEXT_PUBLIC_GRAPHQL_EP as string, {
  headers: {
    "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET as string,
  },
});

export default zeusChain;
