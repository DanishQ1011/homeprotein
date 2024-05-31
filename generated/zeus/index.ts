/* eslint-disable */

import { AllTypesProps, ReturnTypes, Ops } from "./const";
import fetch, { Response } from "node-fetch";
import WebSocket from "ws";
export const HOST = "http://localhost:8080/v1/graphql";

export const HEADERS = {};
export const apiSubscription = (options: chainOptions) => (query: string) => {
  try {
    const queryString = options[0] + "?query=" + encodeURIComponent(query);
    const wsString = queryString.replace("http", "ws");
    const host = (options.length > 1 && options[1]?.websocket?.[0]) || wsString;
    const webSocketOptions = options[1]?.websocket || [host];
    const ws = new WebSocket(...webSocketOptions);
    return {
      ws,
      on: (e: (args: any) => void) => {
        ws.onmessage = (event: any) => {
          if (event.data) {
            const parsed = JSON.parse(event.data);
            const data = parsed.data;
            return e(data);
          }
        };
      },
      off: (e: (args: any) => void) => {
        ws.onclose = e;
      },
      error: (e: (args: any) => void) => {
        ws.onerror = e;
      },
      open: (e: () => void) => {
        ws.onopen = e;
      },
    };
  } catch {
    throw new Error("No websockets implemented");
  }
};
const handleFetchResponse = (response: Response): Promise<GraphQLResponse> => {
  if (!response.ok) {
    return new Promise((_, reject) => {
      response
        .text()
        .then((text) => {
          try {
            reject(JSON.parse(text));
          } catch (err) {
            reject(text);
          }
        })
        .catch(reject);
    });
  }
  return response.json() as Promise<GraphQLResponse>;
};

export const apiFetch =
  (options: fetchOptions) =>
  (query: string, variables: Record<string, unknown> = {}) => {
    const fetchOptions = options[1] || {};
    if (fetchOptions.method && fetchOptions.method === "GET") {
      return fetch(
        `${options[0]}?query=${encodeURIComponent(query)}`,
        fetchOptions
      )
        .then(handleFetchResponse)
        .then((response: GraphQLResponse) => {
          if (response.errors) {
            throw new GraphQLError(response);
          }
          return response.data;
        });
    }
    return fetch(`${options[0]}`, {
      body: JSON.stringify({ query, variables }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      ...fetchOptions,
    })
      .then(handleFetchResponse)
      .then((response: GraphQLResponse) => {
        if (response.errors) {
          throw new GraphQLError(response);
        }
        return response.data;
      });
  };

export const InternalsBuildQuery = ({
  ops,
  props,
  returns,
  options,
  scalars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  options?: OperationOptions;
  scalars?: ScalarDefinition;
}) => {
  const ibb = (
    k: string,
    o: InputValueType | VType,
    p = "",
    root = true,
    vars: Array<{ name: string; graphQLType: string }> = []
  ): string => {
    const keyForPath = purifyGraphQLKey(k);
    const newPath = [p, keyForPath].join(SEPARATOR);
    if (!o) {
      return "";
    }
    if (typeof o === "boolean" || typeof o === "number") {
      return k;
    }
    if (typeof o === "string") {
      return `${k} ${o}`;
    }
    if (Array.isArray(o)) {
      const args = InternalArgsBuilt({
        props,
        returns,
        ops,
        scalars,
        vars,
      })(o[0], newPath);
      return `${ibb(args ? `${k}(${args})` : k, o[1], p, false, vars)}`;
    }
    if (k === "__alias") {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (
            typeof objectUnderAlias !== "object" ||
            Array.isArray(objectUnderAlias)
          ) {
            throw new Error(
              "Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}"
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(`${alias}:${operationName}`, operation, p, false, vars);
        })
        .join("\n");
    }
    const hasOperationName =
      root && options?.operationName ? " " + options.operationName : "";
    const keyForDirectives = o.__directives ?? "";
    const query = `{${Object.entries(o)
      .filter(([k]) => k !== "__directives")
      .map((e) =>
        ibb(...e, [p, `field<>${keyForPath}`].join(SEPARATOR), false, vars)
      )
      .join("\n")}}`;
    if (!root) {
      return `${k} ${keyForDirectives}${hasOperationName} ${query}`;
    }
    const varsString = vars
      .map((v) => `${v.name}: ${v.graphQLType}`)
      .join(", ");
    return `${k} ${keyForDirectives}${hasOperationName}${
      varsString ? `(${varsString})` : ""
    } ${query}`;
  };
  return ibb;
};

export const Thunder =
  (fn: FetchFunction) =>
  <
    O extends keyof typeof Ops,
    SCLR extends ScalarDefinition,
    R extends keyof ValueTypes = GenericOperation<O>
  >(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>
  ) =>
  <Z extends ValueTypes[R]>(
    o: (Z & ValueTypes[R]) | ValueTypes[R],
    ops?: OperationOptions & { variables?: Record<string, unknown> }
  ) =>
    fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      }),
      ops?.variables
    ).then((data) => {
      if (graphqlOptions?.scalars) {
        return decodeScalarsInResponse({
          response: data,
          initialOp: operation,
          initialZeusQuery: o as VType,
          returns: ReturnTypes,
          scalars: graphqlOptions.scalars,
          ops: Ops,
        });
      }
      return data;
    }) as Promise<InputType<GraphQLTypes[R], Z, SCLR>>;

export const Chain = (...options: chainOptions) => Thunder(apiFetch(options));

export const SubscriptionThunder =
  (fn: SubscriptionFunction) =>
  <
    O extends keyof typeof Ops,
    SCLR extends ScalarDefinition,
    R extends keyof ValueTypes = GenericOperation<O>
  >(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>
  ) =>
  <Z extends ValueTypes[R]>(
    o: (Z & ValueTypes[R]) | ValueTypes[R],
    ops?: OperationOptions & { variables?: ExtractVariables<Z> }
  ) => {
    const returnedFunction = fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      })
    ) as SubscriptionToGraphQL<Z, GraphQLTypes[R], SCLR>;
    if (returnedFunction?.on && graphqlOptions?.scalars) {
      const wrapped = returnedFunction.on;
      returnedFunction.on = (
        fnToCall: (args: InputType<GraphQLTypes[R], Z, SCLR>) => void
      ) =>
        wrapped((data: InputType<GraphQLTypes[R], Z, SCLR>) => {
          if (graphqlOptions?.scalars) {
            return fnToCall(
              decodeScalarsInResponse({
                response: data,
                initialOp: operation,
                initialZeusQuery: o as VType,
                returns: ReturnTypes,
                scalars: graphqlOptions.scalars,
                ops: Ops,
              })
            );
          }
          return fnToCall(data);
        });
    }
    return returnedFunction;
  };

export const Subscription = (...options: chainOptions) =>
  SubscriptionThunder(apiSubscription(options));
export const Zeus = <
  Z extends ValueTypes[R],
  O extends keyof typeof Ops,
  R extends keyof ValueTypes = GenericOperation<O>
>(
  operation: O,
  o: (Z & ValueTypes[R]) | ValueTypes[R],
  ops?: {
    operationOptions?: OperationOptions;
    scalars?: ScalarDefinition;
  }
) =>
  InternalsBuildQuery({
    props: AllTypesProps,
    returns: ReturnTypes,
    ops: Ops,
    options: ops?.operationOptions,
    scalars: ops?.scalars,
  })(operation, o as VType);

export const ZeusSelect = <T>() => ((t: unknown) => t) as SelectionFunction<T>;

export const Selector = <T extends keyof ValueTypes>(key: T) =>
  key && ZeusSelect<ValueTypes[T]>();

export const TypeFromSelector = <T extends keyof ValueTypes>(key: T) =>
  key && ZeusSelect<ValueTypes[T]>();
export const Gql = Chain(HOST, {
  headers: {
    "Content-Type": "application/json",
    ...HEADERS,
  },
});

export const ZeusScalars = ZeusSelect<ScalarCoders>();

export const decodeScalarsInResponse = <O extends Operations>({
  response,
  scalars,
  returns,
  ops,
  initialZeusQuery,
  initialOp,
}: {
  ops: O;
  response: any;
  returns: ReturnTypesType;
  scalars?: Record<string, ScalarResolver | undefined>;
  initialOp: keyof O;
  initialZeusQuery: InputValueType | VType;
}) => {
  if (!scalars) {
    return response;
  }
  const builder = PrepareScalarPaths({
    ops,
    returns,
  });

  const scalarPaths = builder(
    initialOp as string,
    ops[initialOp],
    initialZeusQuery
  );
  if (scalarPaths) {
    const r = traverseResponse({ scalarPaths, resolvers: scalars })(
      initialOp as string,
      response,
      [ops[initialOp]]
    );
    return r;
  }
  return response;
};

export const traverseResponse = ({
  resolvers,
  scalarPaths,
}: {
  scalarPaths: { [x: string]: `scalar.${string}` };
  resolvers: {
    [x: string]: ScalarResolver | undefined;
  };
}) => {
  const ibb = (
    k: string,
    o: InputValueType | VType,
    p: string[] = []
  ): unknown => {
    if (Array.isArray(o)) {
      return o.map((eachO) => ibb(k, eachO, p));
    }
    if (o == null) {
      return o;
    }
    const scalarPathString = p.join(SEPARATOR);
    const currentScalarString = scalarPaths[scalarPathString];
    if (currentScalarString) {
      const currentDecoder =
        resolvers[currentScalarString.split(".")[1]]?.decode;
      if (currentDecoder) {
        return currentDecoder(o);
      }
    }
    if (
      typeof o === "boolean" ||
      typeof o === "number" ||
      typeof o === "string" ||
      !o
    ) {
      return o;
    }
    const entries = Object.entries(o).map(
      ([k, v]) => [k, ibb(k, v, [...p, purifyGraphQLKey(k)])] as const
    );
    const objectFromEntries = entries.reduce<Record<string, unknown>>(
      (a, [k, v]) => {
        a[k] = v;
        return a;
      },
      {}
    );
    return objectFromEntries;
  };
  return ibb;
};

export type AllTypesPropsType = {
  [x: string]:
    | undefined
    | `scalar.${string}`
    | "enum"
    | {
        [x: string]:
          | undefined
          | string
          | {
              [x: string]: string | undefined;
            };
      };
};

export type ReturnTypesType = {
  [x: string]:
    | {
        [x: string]: string | undefined;
      }
    | `scalar.${string}`
    | undefined;
};
export type InputValueType = {
  [x: string]:
    | undefined
    | boolean
    | string
    | number
    | [any, undefined | boolean | InputValueType]
    | InputValueType;
};
export type VType =
  | undefined
  | boolean
  | string
  | number
  | [any, undefined | boolean | InputValueType]
  | InputValueType;

export type PlainType = boolean | number | string | null | undefined;
export type ZeusArgsType =
  | PlainType
  | {
      [x: string]: ZeusArgsType;
    }
  | Array<ZeusArgsType>;

export type Operations = Record<string, string>;

export type VariableDefinition = {
  [x: string]: unknown;
};

export const SEPARATOR = "|";

export type fetchOptions = Parameters<typeof fetch>;
type websocketOptions = typeof WebSocket extends new (
  ...args: infer R
) => WebSocket
  ? R
  : never;
export type chainOptions =
  | [fetchOptions[0], fetchOptions[1] & { websocket?: websocketOptions }]
  | [fetchOptions[0]];
export type FetchFunction = (
  query: string,
  variables?: Record<string, unknown>
) => Promise<any>;
export type SubscriptionFunction = (query: string) => any;
type NotUndefined<T> = T extends undefined ? never : T;
export type ResolverType<F> = NotUndefined<
  F extends [infer ARGS, any] ? ARGS : undefined
>;

export type OperationOptions = {
  operationName?: string;
};

export type ScalarCoder = Record<string, (s: unknown) => string>;

export interface GraphQLResponse {
  data?: Record<string, any>;
  errors?: Array<{
    message: string;
  }>;
}
export class GraphQLError extends Error {
  constructor(public response: GraphQLResponse) {
    super("");
    console.error(response);
  }
  toString() {
    return "GraphQL Response Error";
  }
}
export type GenericOperation<O> = O extends keyof typeof Ops
  ? (typeof Ops)[O]
  : never;
export type ThunderGraphQLOptions<SCLR extends ScalarDefinition> = {
  scalars?: SCLR | ScalarCoders;
};

const ExtractScalar = (
  mappedParts: string[],
  returns: ReturnTypesType
): `scalar.${string}` | undefined => {
  if (mappedParts.length === 0) {
    return;
  }
  const oKey = mappedParts[0];
  const returnP1 = returns[oKey];
  if (typeof returnP1 === "object") {
    const returnP2 = returnP1[mappedParts[1]];
    if (returnP2) {
      return ExtractScalar([returnP2, ...mappedParts.slice(2)], returns);
    }
    return undefined;
  }
  return returnP1 as `scalar.${string}` | undefined;
};

export const PrepareScalarPaths = ({
  ops,
  returns,
}: {
  returns: ReturnTypesType;
  ops: Operations;
}) => {
  const ibb = (
    k: string,
    originalKey: string,
    o: InputValueType | VType,
    p: string[] = [],
    pOriginals: string[] = [],
    root = true
  ): { [x: string]: `scalar.${string}` } | undefined => {
    if (!o) {
      return;
    }
    if (
      typeof o === "boolean" ||
      typeof o === "number" ||
      typeof o === "string"
    ) {
      const extractionArray = [...pOriginals, originalKey];
      const isScalar = ExtractScalar(extractionArray, returns);
      if (isScalar?.startsWith("scalar")) {
        const partOfTree = {
          [[...p, k].join(SEPARATOR)]: isScalar,
        };
        return partOfTree;
      }
      return {};
    }
    if (Array.isArray(o)) {
      return ibb(k, k, o[1], p, pOriginals, false);
    }
    if (k === "__alias") {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (
            typeof objectUnderAlias !== "object" ||
            Array.isArray(objectUnderAlias)
          ) {
            throw new Error(
              "Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}"
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(alias, operationName, operation, p, pOriginals, false);
        })
        .reduce((a, b) => ({
          ...a,
          ...b,
        }));
    }
    const keyName = root ? ops[k] : k;
    return Object.entries(o)
      .filter(([k]) => k !== "__directives")
      .map(([k, v]) => {
        // Inline fragments shouldn't be added to the path as they aren't a field
        const isInlineFragment = originalKey.match(/^...\s*on/) != null;
        return ibb(
          k,
          k,
          v,
          isInlineFragment ? p : [...p, purifyGraphQLKey(keyName || k)],
          isInlineFragment
            ? pOriginals
            : [...pOriginals, purifyGraphQLKey(originalKey)],
          false
        );
      })
      .reduce((a, b) => ({
        ...a,
        ...b,
      }));
  };
  return ibb;
};

export const purifyGraphQLKey = (k: string) =>
  k.replace(/\([^)]*\)/g, "").replace(/^[^:]*\:/g, "");

const mapPart = (p: string) => {
  const [isArg, isField] = p.split("<>");
  if (isField) {
    return {
      v: isField,
      __type: "field",
    } as const;
  }
  return {
    v: isArg,
    __type: "arg",
  } as const;
};

type Part = ReturnType<typeof mapPart>;

export const ResolveFromPath = (
  props: AllTypesPropsType,
  returns: ReturnTypesType,
  ops: Operations
) => {
  const ResolvePropsType = (mappedParts: Part[]) => {
    const oKey = ops[mappedParts[0].v];
    const propsP1 = oKey ? props[oKey] : props[mappedParts[0].v];
    if (propsP1 === "enum" && mappedParts.length === 1) {
      return "enum";
    }
    if (
      typeof propsP1 === "string" &&
      propsP1.startsWith("scalar.") &&
      mappedParts.length === 1
    ) {
      return propsP1;
    }
    if (typeof propsP1 === "object") {
      if (mappedParts.length < 2) {
        return "not";
      }
      const propsP2 = propsP1[mappedParts[1].v];
      if (typeof propsP2 === "string") {
        return rpp(
          `${propsP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`
        );
      }
      if (typeof propsP2 === "object") {
        if (mappedParts.length < 3) {
          return "not";
        }
        const propsP3 = propsP2[mappedParts[2].v];
        if (propsP3 && mappedParts[2].__type === "arg") {
          return rpp(
            `${propsP3}${SEPARATOR}${mappedParts
              .slice(3)
              .map((mp) => mp.v)
              .join(SEPARATOR)}`
          );
        }
      }
    }
  };
  const ResolveReturnType = (mappedParts: Part[]) => {
    if (mappedParts.length === 0) {
      return "not";
    }
    const oKey = ops[mappedParts[0].v];
    const returnP1 = oKey ? returns[oKey] : returns[mappedParts[0].v];
    if (typeof returnP1 === "object") {
      if (mappedParts.length < 2) return "not";
      const returnP2 = returnP1[mappedParts[1].v];
      if (returnP2) {
        return rpp(
          `${returnP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`
        );
      }
    }
  };
  const rpp = (path: string): "enum" | "not" | `scalar.${string}` => {
    const parts = path.split(SEPARATOR).filter((l) => l.length > 0);
    const mappedParts = parts.map(mapPart);
    const propsP1 = ResolvePropsType(mappedParts);
    if (propsP1) {
      return propsP1;
    }
    const returnP1 = ResolveReturnType(mappedParts);
    if (returnP1) {
      return returnP1;
    }
    return "not";
  };
  return rpp;
};

export const InternalArgsBuilt = ({
  props,
  ops,
  returns,
  scalars,
  vars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  scalars?: ScalarDefinition;
  vars: Array<{ name: string; graphQLType: string }>;
}) => {
  const arb = (a: ZeusArgsType, p = "", root = true): string => {
    if (typeof a === "string") {
      if (a.startsWith(START_VAR_NAME)) {
        const [varName, graphQLType] = a
          .replace(START_VAR_NAME, "$")
          .split(GRAPHQL_TYPE_SEPARATOR);
        const v = vars.find((v) => v.name === varName);
        if (!v) {
          vars.push({
            name: varName,
            graphQLType,
          });
        } else {
          if (v.graphQLType !== graphQLType) {
            throw new Error(
              `Invalid variable exists with two different GraphQL Types, "${v.graphQLType}" and ${graphQLType}`
            );
          }
        }
        return varName;
      }
    }
    const checkType = ResolveFromPath(props, returns, ops)(p);
    if (checkType.startsWith("scalar.")) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, ...splittedScalar] = checkType.split(".");
      const scalarKey = splittedScalar.join(".");
      return (scalars?.[scalarKey]?.encode?.(a) as string) || JSON.stringify(a);
    }
    if (Array.isArray(a)) {
      return `[${a.map((arr) => arb(arr, p, false)).join(", ")}]`;
    }
    if (typeof a === "string") {
      if (checkType === "enum") {
        return a;
      }
      return `${JSON.stringify(a)}`;
    }
    if (typeof a === "object") {
      if (a === null) {
        return `null`;
      }
      const returnedObjectString = Object.entries(a)
        .filter(([, v]) => typeof v !== "undefined")
        .map(([k, v]) => `${k}: ${arb(v, [p, k].join(SEPARATOR), false)}`)
        .join(",\n");
      if (!root) {
        return `{${returnedObjectString}}`;
      }
      return returnedObjectString;
    }
    return `${a}`;
  };
  return arb;
};

export const resolverFor = <
  X,
  T extends keyof ResolverInputTypes,
  Z extends keyof ResolverInputTypes[T]
>(
  type: T,
  field: Z,
  fn: (
    args: Required<ResolverInputTypes[T]>[Z] extends [infer Input, any]
      ? Input
      : any,
    source: any
  ) => Z extends keyof ModelTypes[T]
    ? ModelTypes[T][Z] | Promise<ModelTypes[T][Z]> | X
    : never
) => fn as (args?: any, source?: any) => ReturnType<typeof fn>;

export type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
export type ZeusState<T extends (...args: any[]) => Promise<any>> = NonNullable<
  UnwrapPromise<ReturnType<T>>
>;
export type ZeusHook<
  T extends (
    ...args: any[]
  ) => Record<string, (...args: any[]) => Promise<any>>,
  N extends keyof ReturnType<T>
> = ZeusState<ReturnType<T>[N]>;

export type WithTypeNameValue<T> = T & {
  __typename?: boolean;
  __directives?: string;
};
export type AliasType<T> = WithTypeNameValue<T> & {
  __alias?: Record<string, WithTypeNameValue<T>>;
};
type DeepAnify<T> = {
  [P in keyof T]?: any;
};
type IsPayLoad<T> = T extends [any, infer PayLoad] ? PayLoad : T;
export type ScalarDefinition = Record<string, ScalarResolver>;

type IsScalar<S, SCLR extends ScalarDefinition> = S extends "scalar" & {
  name: infer T;
}
  ? T extends keyof SCLR
    ? SCLR[T]["decode"] extends (s: unknown) => unknown
      ? ReturnType<SCLR[T]["decode"]>
      : unknown
    : unknown
  : S;
type IsArray<T, U, SCLR extends ScalarDefinition> = T extends Array<infer R>
  ? InputType<R, U, SCLR>[]
  : InputType<T, U, SCLR>;
type FlattenArray<T> = T extends Array<infer R> ? R : T;
type BaseZeusResolver = boolean | 1 | string | Variable<any, string>;

type IsInterfaced<
  SRC extends DeepAnify<DST>,
  DST,
  SCLR extends ScalarDefinition
> = FlattenArray<SRC> extends ZEUS_INTERFACES | ZEUS_UNIONS
  ? {
      [P in keyof SRC]: SRC[P] extends "__union" & infer R
        ? P extends keyof DST
          ? IsArray<
              R,
              "__typename" extends keyof DST
                ? DST[P] & { __typename: true }
                : DST[P],
              SCLR
            >
          : IsArray<
              R,
              "__typename" extends keyof DST
                ? { __typename: true }
                : Record<string, never>,
              SCLR
            >
        : never;
    }[keyof SRC] & {
      [P in keyof Omit<
        Pick<
          SRC,
          {
            [P in keyof DST]: SRC[P] extends "__union" & infer R ? never : P;
          }[keyof DST]
        >,
        "__typename"
      >]: IsPayLoad<DST[P]> extends BaseZeusResolver
        ? IsScalar<SRC[P], SCLR>
        : IsArray<SRC[P], DST[P], SCLR>;
    }
  : {
      [P in keyof Pick<SRC, keyof DST>]: IsPayLoad<
        DST[P]
      > extends BaseZeusResolver
        ? IsScalar<SRC[P], SCLR>
        : IsArray<SRC[P], DST[P], SCLR>;
    };

export type MapType<
  SRC,
  DST,
  SCLR extends ScalarDefinition
> = SRC extends DeepAnify<DST> ? IsInterfaced<SRC, DST, SCLR> : never;
// eslint-disable-next-line @typescript-eslint/ban-types
export type InputType<
  SRC,
  DST,
  SCLR extends ScalarDefinition = {}
> = IsPayLoad<DST> extends { __alias: infer R }
  ? {
      [P in keyof R]: MapType<SRC, R[P], SCLR>[keyof MapType<SRC, R[P], SCLR>];
    } & MapType<SRC, Omit<IsPayLoad<DST>, "__alias">, SCLR>
  : MapType<SRC, IsPayLoad<DST>, SCLR>;
export type SubscriptionToGraphQL<Z, T, SCLR extends ScalarDefinition> = {
  ws: WebSocket;
  on: (fn: (args: InputType<T, Z, SCLR>) => void) => void;
  off: (
    fn: (e: {
      data?: InputType<T, Z, SCLR>;
      code?: number;
      reason?: string;
      message?: string;
    }) => void
  ) => void;
  error: (
    fn: (e: { data?: InputType<T, Z, SCLR>; errors?: string[] }) => void
  ) => void;
  open: () => void;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type FromSelector<
  SELECTOR,
  NAME extends keyof GraphQLTypes,
  SCLR extends ScalarDefinition = {}
> = InputType<GraphQLTypes[NAME], SELECTOR, SCLR>;

export type ScalarResolver = {
  encode?: (s: unknown) => string;
  decode?: (s: unknown) => unknown;
};

export type SelectionFunction<V> = <T>(t: T | V) => T;

type BuiltInVariableTypes = {
  ["String"]: string;
  ["Int"]: number;
  ["Float"]: number;
  ["ID"]: unknown;
  ["Boolean"]: boolean;
};
type AllVariableTypes = keyof BuiltInVariableTypes | keyof ZEUS_VARIABLES;
type VariableRequired<T extends string> =
  | `${T}!`
  | T
  | `[${T}]`
  | `[${T}]!`
  | `[${T}!]`
  | `[${T}!]!`;
type VR<T extends string> = VariableRequired<VariableRequired<T>>;

export type GraphQLVariableType = VR<AllVariableTypes>;

type ExtractVariableTypeString<T extends string> = T extends VR<infer R1>
  ? R1 extends VR<infer R2>
    ? R2 extends VR<infer R3>
      ? R3 extends VR<infer R4>
        ? R4 extends VR<infer R5>
          ? R5
          : R4
        : R3
      : R2
    : R1
  : T;

type DecomposeType<T, Type> = T extends `[${infer R}]`
  ? Array<DecomposeType<R, Type>> | undefined
  : T extends `${infer R}!`
  ? NonNullable<DecomposeType<R, Type>>
  : Type | undefined;

type ExtractTypeFromGraphQLType<T extends string> =
  T extends keyof ZEUS_VARIABLES
    ? ZEUS_VARIABLES[T]
    : T extends keyof BuiltInVariableTypes
    ? BuiltInVariableTypes[T]
    : any;

export type GetVariableType<T extends string> = DecomposeType<
  T,
  ExtractTypeFromGraphQLType<ExtractVariableTypeString<T>>
>;

type UndefinedKeys<T> = {
  [K in keyof T]-?: T[K] extends NonNullable<T[K]> ? never : K;
}[keyof T];

type WithNullableKeys<T> = Pick<T, UndefinedKeys<T>>;
type WithNonNullableKeys<T> = Omit<T, UndefinedKeys<T>>;

type OptionalKeys<T> = {
  [P in keyof T]?: T[P];
};

export type WithOptionalNullables<T> = OptionalKeys<WithNullableKeys<T>> &
  WithNonNullableKeys<T>;

export type Variable<T extends GraphQLVariableType, Name extends string> = {
  " __zeus_name": Name;
  " __zeus_type": T;
};

export type ExtractVariablesDeep<Query> = Query extends Variable<
  infer VType,
  infer VName
>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends string | number | boolean | Array<string | number | boolean>
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<
      {
        [K in keyof Query]: WithOptionalNullables<
          ExtractVariablesDeep<Query[K]>
        >;
      }[keyof Query]
    >;

export type ExtractVariables<Query> = Query extends Variable<
  infer VType,
  infer VName
>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends [infer Inputs, infer Outputs]
  ? ExtractVariablesDeep<Inputs> & ExtractVariables<Outputs>
  : Query extends string | number | boolean | Array<string | number | boolean>
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<
      {
        [K in keyof Query]: WithOptionalNullables<ExtractVariables<Query[K]>>;
      }[keyof Query]
    >;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export const START_VAR_NAME = `$ZEUS_VAR`;
export const GRAPHQL_TYPE_SEPARATOR = `__$GRAPHQL__`;

export const $ = <Type extends GraphQLVariableType, Name extends string>(
  name: Name,
  graphqlType: Type
) => {
  return (START_VAR_NAME +
    name +
    GRAPHQL_TYPE_SEPARATOR +
    graphqlType) as unknown as Variable<Type, Name>;
};
type ZEUS_INTERFACES = never;
export type ScalarCoders = {
  date?: ScalarResolver;
  time?: ScalarResolver;
  timestamptz?: ScalarResolver;
  timetz?: ScalarResolver;
  uuid?: ScalarResolver;
};
type ZEUS_UNIONS = never;

export type ValueTypes = {
  /** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
  ["Boolean_comparison_exp"]: {
    _eq?: boolean | undefined | null | Variable<any, string>;
    _gt?: boolean | undefined | null | Variable<any, string>;
    _gte?: boolean | undefined | null | Variable<any, string>;
    _in?: Array<boolean> | undefined | null | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _lt?: boolean | undefined | null | Variable<any, string>;
    _lte?: boolean | undefined | null | Variable<any, string>;
    _neq?: boolean | undefined | null | Variable<any, string>;
    _nin?: Array<boolean> | undefined | null | Variable<any, string>;
  };
  /** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
  ["Int_comparison_exp"]: {
    _eq?: number | undefined | null | Variable<any, string>;
    _gt?: number | undefined | null | Variable<any, string>;
    _gte?: number | undefined | null | Variable<any, string>;
    _in?: Array<number> | undefined | null | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _lt?: number | undefined | null | Variable<any, string>;
    _lte?: number | undefined | null | Variable<any, string>;
    _neq?: number | undefined | null | Variable<any, string>;
    _nin?: Array<number> | undefined | null | Variable<any, string>;
  };
  /** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
  ["String_comparison_exp"]: {
    _eq?: string | undefined | null | Variable<any, string>;
    _gt?: string | undefined | null | Variable<any, string>;
    _gte?: string | undefined | null | Variable<any, string>;
    /** does the column match the given case-insensitive pattern */
    _ilike?: string | undefined | null | Variable<any, string>;
    _in?: Array<string> | undefined | null | Variable<any, string>;
    /** does the column match the given POSIX regular expression, case insensitive */
    _iregex?: string | undefined | null | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    /** does the column match the given pattern */
    _like?: string | undefined | null | Variable<any, string>;
    _lt?: string | undefined | null | Variable<any, string>;
    _lte?: string | undefined | null | Variable<any, string>;
    _neq?: string | undefined | null | Variable<any, string>;
    /** does the column NOT match the given case-insensitive pattern */
    _nilike?: string | undefined | null | Variable<any, string>;
    _nin?: Array<string> | undefined | null | Variable<any, string>;
    /** does the column NOT match the given POSIX regular expression, case insensitive */
    _niregex?: string | undefined | null | Variable<any, string>;
    /** does the column NOT match the given pattern */
    _nlike?: string | undefined | null | Variable<any, string>;
    /** does the column NOT match the given POSIX regular expression, case sensitive */
    _nregex?: string | undefined | null | Variable<any, string>;
    /** does the column NOT match the given SQL regular expression */
    _nsimilar?: string | undefined | null | Variable<any, string>;
    /** does the column match the given POSIX regular expression, case sensitive */
    _regex?: string | undefined | null | Variable<any, string>;
    /** does the column match the given SQL regular expression */
    _similar?: string | undefined | null | Variable<any, string>;
  };
  /** ordering argument of a cursor */
  ["cursor_ordering"]: cursor_ordering;
  ["date"]: unknown;
  /** Boolean expression to compare columns of type "date". All fields are combined with logical 'AND'. */
  ["date_comparison_exp"]: {
    _eq?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    _gt?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    _gte?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    _in?: Array<ValueTypes["date"]> | undefined | null | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _lt?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    _lte?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    _neq?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    _nin?: Array<ValueTypes["date"]> | undefined | null | Variable<any, string>;
  };
  /** columns and relationships of "meals" */
  ["meals"]: AliasType<{
    id?: boolean | `@${string}`;
    name?: boolean | `@${string}`;
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "meals" */
  ["meals_aggregate"]: AliasType<{
    aggregate?: ValueTypes["meals_aggregate_fields"];
    nodes?: ValueTypes["meals"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "meals" */
  ["meals_aggregate_fields"]: AliasType<{
    avg?: ValueTypes["meals_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ValueTypes["meals_select_column"]>
          | undefined
          | null
          | Variable<any, string>;
        distinct?: boolean | undefined | null | Variable<any, string>;
      },
      boolean | `@${string}`
    ];
    max?: ValueTypes["meals_max_fields"];
    min?: ValueTypes["meals_min_fields"];
    stddev?: ValueTypes["meals_stddev_fields"];
    stddev_pop?: ValueTypes["meals_stddev_pop_fields"];
    stddev_samp?: ValueTypes["meals_stddev_samp_fields"];
    sum?: ValueTypes["meals_sum_fields"];
    var_pop?: ValueTypes["meals_var_pop_fields"];
    var_samp?: ValueTypes["meals_var_samp_fields"];
    variance?: ValueTypes["meals_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate avg on columns */
  ["meals_avg_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "meals". All fields are combined with a logical 'AND'. */
  ["meals_bool_exp"]: {
    _and?:
      | Array<ValueTypes["meals_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    _not?:
      | ValueTypes["meals_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    _or?:
      | Array<ValueTypes["meals_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    id?:
      | ValueTypes["Int_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    name?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    type?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** unique or primary key constraints on table "meals" */
  ["meals_constraint"]: meals_constraint;
  /** input type for incrementing numeric columns in table "meals" */
  ["meals_inc_input"]: {
    id?: number | undefined | null | Variable<any, string>;
  };
  /** input type for inserting data into table "meals" */
  ["meals_insert_input"]: {
    id?: number | undefined | null | Variable<any, string>;
    name?: string | undefined | null | Variable<any, string>;
    type?: string | undefined | null | Variable<any, string>;
  };
  /** aggregate max on columns */
  ["meals_max_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    name?: boolean | `@${string}`;
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["meals_min_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    name?: boolean | `@${string}`;
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "meals" */
  ["meals_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ValueTypes["meals"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "meals" */
  ["meals_on_conflict"]: {
    constraint: ValueTypes["meals_constraint"] | Variable<any, string>;
    update_columns:
      | Array<ValueTypes["meals_update_column"]>
      | Variable<any, string>;
    where?:
      | ValueTypes["meals_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Ordering options when selecting data from "meals". */
  ["meals_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    type?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** primary key columns input for table: meals */
  ["meals_pk_columns_input"]: {
    id: number | Variable<any, string>;
  };
  /** select columns of table "meals" */
  ["meals_select_column"]: meals_select_column;
  /** input type for updating data in table "meals" */
  ["meals_set_input"]: {
    id?: number | undefined | null | Variable<any, string>;
    name?: string | undefined | null | Variable<any, string>;
    type?: string | undefined | null | Variable<any, string>;
  };
  /** aggregate stddev on columns */
  ["meals_stddev_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_pop on columns */
  ["meals_stddev_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_samp on columns */
  ["meals_stddev_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Streaming cursor of the table "meals" */
  ["meals_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value:
      | ValueTypes["meals_stream_cursor_value_input"]
      | Variable<any, string>;
    /** cursor ordering */
    ordering?:
      | ValueTypes["cursor_ordering"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Initial value of the column from where the streaming should start */
  ["meals_stream_cursor_value_input"]: {
    id?: number | undefined | null | Variable<any, string>;
    name?: string | undefined | null | Variable<any, string>;
    type?: string | undefined | null | Variable<any, string>;
  };
  /** aggregate sum on columns */
  ["meals_sum_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** update columns of table "meals" */
  ["meals_update_column"]: meals_update_column;
  ["meals_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?:
      | ValueTypes["meals_inc_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ValueTypes["meals_set_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** filter the rows which have to be updated */
    where: ValueTypes["meals_bool_exp"] | Variable<any, string>;
  };
  /** aggregate var_pop on columns */
  ["meals_var_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate var_samp on columns */
  ["meals_var_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate variance on columns */
  ["meals_variance_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** mutation root */
  ["mutation_root"]: AliasType<{
    delete_meals?: [
      {
        /** filter the rows which have to be deleted */
        where: ValueTypes["meals_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["meals_mutation_response"]
    ];
    delete_meals_by_pk?: [
      { id: number | Variable<any, string> },
      ValueTypes["meals"]
    ];
    delete_order_delivery_status?: [
      {
        /** filter the rows which have to be deleted */
        where:
          | ValueTypes["order_delivery_status_bool_exp"]
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status_mutation_response"]
    ];
    delete_order_delivery_status_by_pk?: [
      { value: string | Variable<any, string> },
      ValueTypes["order_delivery_status"]
    ];
    delete_orders?: [
      {
        /** filter the rows which have to be deleted */
        where: ValueTypes["orders_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["orders_mutation_response"]
    ];
    delete_orders_by_pk?: [
      { id: ValueTypes["uuid"] | Variable<any, string> },
      ValueTypes["orders"]
    ];
    delete_slots?: [
      {
        /** filter the rows which have to be deleted */
        where: ValueTypes["slots_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["slots_mutation_response"]
    ];
    delete_slots_by_pk?: [
      { id: number | Variable<any, string> },
      ValueTypes["slots"]
    ];
    delete_subscription_plan_frequency?: [
      {
        /** filter the rows which have to be deleted */
        where:
          | ValueTypes["subscription_plan_frequency_bool_exp"]
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency_mutation_response"]
    ];
    delete_subscription_plan_frequency_by_pk?: [
      { value: string | Variable<any, string> },
      ValueTypes["subscription_plan_frequency"]
    ];
    delete_subscription_plan_type?: [
      {
        /** filter the rows which have to be deleted */
        where:
          | ValueTypes["subscription_plan_type_bool_exp"]
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type_mutation_response"]
    ];
    delete_subscription_plan_type_by_pk?: [
      { value: string | Variable<any, string> },
      ValueTypes["subscription_plan_type"]
    ];
    delete_subscription_plans?: [
      {
        /** filter the rows which have to be deleted */
        where:
          | ValueTypes["subscription_plans_bool_exp"]
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans_mutation_response"]
    ];
    delete_subscription_plans_by_pk?: [
      { id: number | Variable<any, string> },
      ValueTypes["subscription_plans"]
    ];
    delete_subscriptions?: [
      {
        /** filter the rows which have to be deleted */
        where: ValueTypes["subscriptions_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["subscriptions_mutation_response"]
    ];
    delete_subscriptions_by_pk?: [
      { id: ValueTypes["uuid"] | Variable<any, string> },
      ValueTypes["subscriptions"]
    ];
    delete_users?: [
      {
        /** filter the rows which have to be deleted */
        where: ValueTypes["users_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["users_mutation_response"]
    ];
    delete_users_by_pk?: [
      { id: ValueTypes["uuid"] | Variable<any, string> },
      ValueTypes["users"]
    ];
    insert_meals?: [
      {
        /** the rows to be inserted */
        objects:
          | Array<ValueTypes["meals_insert_input"]>
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["meals_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["meals_mutation_response"]
    ];
    insert_meals_one?: [
      {
        /** the row to be inserted */
        object:
          | ValueTypes["meals_insert_input"]
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["meals_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["meals"]
    ];
    insert_order_delivery_status?: [
      {
        /** the rows to be inserted */
        objects:
          | Array<ValueTypes["order_delivery_status_insert_input"]>
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["order_delivery_status_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status_mutation_response"]
    ];
    insert_order_delivery_status_one?: [
      {
        /** the row to be inserted */
        object:
          | ValueTypes["order_delivery_status_insert_input"]
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["order_delivery_status_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status"]
    ];
    insert_orders?: [
      {
        /** the rows to be inserted */
        objects:
          | Array<ValueTypes["orders_insert_input"]>
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["orders_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["orders_mutation_response"]
    ];
    insert_orders_one?: [
      {
        /** the row to be inserted */
        object:
          | ValueTypes["orders_insert_input"]
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["orders_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["orders"]
    ];
    insert_slots?: [
      {
        /** the rows to be inserted */
        objects:
          | Array<ValueTypes["slots_insert_input"]>
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["slots_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["slots_mutation_response"]
    ];
    insert_slots_one?: [
      {
        /** the row to be inserted */
        object:
          | ValueTypes["slots_insert_input"]
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["slots_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["slots"]
    ];
    insert_subscription_plan_frequency?: [
      {
        /** the rows to be inserted */
        objects:
          | Array<ValueTypes["subscription_plan_frequency_insert_input"]>
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["subscription_plan_frequency_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency_mutation_response"]
    ];
    insert_subscription_plan_frequency_one?: [
      {
        /** the row to be inserted */
        object:
          | ValueTypes["subscription_plan_frequency_insert_input"]
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["subscription_plan_frequency_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency"]
    ];
    insert_subscription_plan_type?: [
      {
        /** the rows to be inserted */
        objects:
          | Array<ValueTypes["subscription_plan_type_insert_input"]>
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["subscription_plan_type_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type_mutation_response"]
    ];
    insert_subscription_plan_type_one?: [
      {
        /** the row to be inserted */
        object:
          | ValueTypes["subscription_plan_type_insert_input"]
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["subscription_plan_type_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type"]
    ];
    insert_subscription_plans?: [
      {
        /** the rows to be inserted */
        objects:
          | Array<ValueTypes["subscription_plans_insert_input"]>
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["subscription_plans_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans_mutation_response"]
    ];
    insert_subscription_plans_one?: [
      {
        /** the row to be inserted */
        object:
          | ValueTypes["subscription_plans_insert_input"]
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["subscription_plans_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans"]
    ];
    insert_subscriptions?: [
      {
        /** the rows to be inserted */
        objects:
          | Array<ValueTypes["subscriptions_insert_input"]>
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["subscriptions_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscriptions_mutation_response"]
    ];
    insert_subscriptions_one?: [
      {
        /** the row to be inserted */
        object:
          | ValueTypes["subscriptions_insert_input"]
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["subscriptions_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscriptions"]
    ];
    insert_users?: [
      {
        /** the rows to be inserted */
        objects:
          | Array<ValueTypes["users_insert_input"]>
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["users_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["users_mutation_response"]
    ];
    insert_users_one?: [
      {
        /** the row to be inserted */
        object:
          | ValueTypes["users_insert_input"]
          | Variable<any, string> /** upsert condition */;
        on_conflict?:
          | ValueTypes["users_on_conflict"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["users"]
    ];
    update_meals?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["meals_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["meals_set_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** filter the rows which have to be updated */;
        where: ValueTypes["meals_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["meals_mutation_response"]
    ];
    update_meals_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["meals_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["meals_set_input"]
          | undefined
          | null
          | Variable<any, string>;
        pk_columns:
          | ValueTypes["meals_pk_columns_input"]
          | Variable<any, string>;
      },
      ValueTypes["meals"]
    ];
    update_meals_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ValueTypes["meals_updates"]> | Variable<any, string>;
      },
      ValueTypes["meals_mutation_response"]
    ];
    update_order_delivery_status?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ValueTypes["order_delivery_status_set_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** filter the rows which have to be updated */;
        where:
          | ValueTypes["order_delivery_status_bool_exp"]
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status_mutation_response"]
    ];
    update_order_delivery_status_by_pk?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ValueTypes["order_delivery_status_set_input"]
          | undefined
          | null
          | Variable<any, string>;
        pk_columns:
          | ValueTypes["order_delivery_status_pk_columns_input"]
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status"]
    ];
    update_order_delivery_status_many?: [
      {
        /** updates to execute, in order */
        updates:
          | Array<ValueTypes["order_delivery_status_updates"]>
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status_mutation_response"]
    ];
    update_orders?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["orders_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["orders_set_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** filter the rows which have to be updated */;
        where: ValueTypes["orders_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["orders_mutation_response"]
    ];
    update_orders_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["orders_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["orders_set_input"]
          | undefined
          | null
          | Variable<any, string>;
        pk_columns:
          | ValueTypes["orders_pk_columns_input"]
          | Variable<any, string>;
      },
      ValueTypes["orders"]
    ];
    update_orders_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ValueTypes["orders_updates"]> | Variable<any, string>;
      },
      ValueTypes["orders_mutation_response"]
    ];
    update_slots?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["slots_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["slots_set_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** filter the rows which have to be updated */;
        where: ValueTypes["slots_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["slots_mutation_response"]
    ];
    update_slots_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["slots_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["slots_set_input"]
          | undefined
          | null
          | Variable<any, string>;
        pk_columns:
          | ValueTypes["slots_pk_columns_input"]
          | Variable<any, string>;
      },
      ValueTypes["slots"]
    ];
    update_slots_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ValueTypes["slots_updates"]> | Variable<any, string>;
      },
      ValueTypes["slots_mutation_response"]
    ];
    update_subscription_plan_frequency?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ValueTypes["subscription_plan_frequency_set_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** filter the rows which have to be updated */;
        where:
          | ValueTypes["subscription_plan_frequency_bool_exp"]
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency_mutation_response"]
    ];
    update_subscription_plan_frequency_by_pk?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ValueTypes["subscription_plan_frequency_set_input"]
          | undefined
          | null
          | Variable<any, string>;
        pk_columns:
          | ValueTypes["subscription_plan_frequency_pk_columns_input"]
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency"]
    ];
    update_subscription_plan_frequency_many?: [
      {
        /** updates to execute, in order */
        updates:
          | Array<ValueTypes["subscription_plan_frequency_updates"]>
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency_mutation_response"]
    ];
    update_subscription_plan_type?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ValueTypes["subscription_plan_type_set_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** filter the rows which have to be updated */;
        where:
          | ValueTypes["subscription_plan_type_bool_exp"]
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type_mutation_response"]
    ];
    update_subscription_plan_type_by_pk?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ValueTypes["subscription_plan_type_set_input"]
          | undefined
          | null
          | Variable<any, string>;
        pk_columns:
          | ValueTypes["subscription_plan_type_pk_columns_input"]
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type"]
    ];
    update_subscription_plan_type_many?: [
      {
        /** updates to execute, in order */
        updates:
          | Array<ValueTypes["subscription_plan_type_updates"]>
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type_mutation_response"]
    ];
    update_subscription_plans?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["subscription_plans_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["subscription_plans_set_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** filter the rows which have to be updated */;
        where:
          | ValueTypes["subscription_plans_bool_exp"]
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans_mutation_response"]
    ];
    update_subscription_plans_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["subscription_plans_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["subscription_plans_set_input"]
          | undefined
          | null
          | Variable<any, string>;
        pk_columns:
          | ValueTypes["subscription_plans_pk_columns_input"]
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans"]
    ];
    update_subscription_plans_many?: [
      {
        /** updates to execute, in order */
        updates:
          | Array<ValueTypes["subscription_plans_updates"]>
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans_mutation_response"]
    ];
    update_subscriptions?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["subscriptions_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["subscriptions_set_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** filter the rows which have to be updated */;
        where: ValueTypes["subscriptions_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["subscriptions_mutation_response"]
    ];
    update_subscriptions_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ValueTypes["subscriptions_inc_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ValueTypes["subscriptions_set_input"]
          | undefined
          | null
          | Variable<any, string>;
        pk_columns:
          | ValueTypes["subscriptions_pk_columns_input"]
          | Variable<any, string>;
      },
      ValueTypes["subscriptions"]
    ];
    update_subscriptions_many?: [
      {
        /** updates to execute, in order */
        updates:
          | Array<ValueTypes["subscriptions_updates"]>
          | Variable<any, string>;
      },
      ValueTypes["subscriptions_mutation_response"]
    ];
    update_users?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ValueTypes["users_set_input"]
          | undefined
          | null
          | Variable<
              any,
              string
            > /** filter the rows which have to be updated */;
        where: ValueTypes["users_bool_exp"] | Variable<any, string>;
      },
      ValueTypes["users_mutation_response"]
    ];
    update_users_by_pk?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ValueTypes["users_set_input"]
          | undefined
          | null
          | Variable<any, string>;
        pk_columns:
          | ValueTypes["users_pk_columns_input"]
          | Variable<any, string>;
      },
      ValueTypes["users"]
    ];
    update_users_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ValueTypes["users_updates"]> | Variable<any, string>;
      },
      ValueTypes["users_mutation_response"]
    ];
    __typename?: boolean | `@${string}`;
  }>;
  /** column ordering options */
  ["order_by"]: order_by;
  /** columns and relationships of "order_delivery_status" */
  ["order_delivery_status"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "order_delivery_status" */
  ["order_delivery_status_aggregate"]: AliasType<{
    aggregate?: ValueTypes["order_delivery_status_aggregate_fields"];
    nodes?: ValueTypes["order_delivery_status"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "order_delivery_status" */
  ["order_delivery_status_aggregate_fields"]: AliasType<{
    count?: [
      {
        columns?:
          | Array<ValueTypes["order_delivery_status_select_column"]>
          | undefined
          | null
          | Variable<any, string>;
        distinct?: boolean | undefined | null | Variable<any, string>;
      },
      boolean | `@${string}`
    ];
    max?: ValueTypes["order_delivery_status_max_fields"];
    min?: ValueTypes["order_delivery_status_min_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "order_delivery_status". All fields are combined with a logical 'AND'. */
  ["order_delivery_status_bool_exp"]: {
    _and?:
      | Array<ValueTypes["order_delivery_status_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    _not?:
      | ValueTypes["order_delivery_status_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    _or?:
      | Array<ValueTypes["order_delivery_status_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    value?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** unique or primary key constraints on table "order_delivery_status" */
  ["order_delivery_status_constraint"]: order_delivery_status_constraint;
  ["order_delivery_status_enum"]: order_delivery_status_enum;
  /** Boolean expression to compare columns of type "order_delivery_status_enum". All fields are combined with logical 'AND'. */
  ["order_delivery_status_enum_comparison_exp"]: {
    _eq?:
      | ValueTypes["order_delivery_status_enum"]
      | undefined
      | null
      | Variable<any, string>;
    _in?:
      | Array<ValueTypes["order_delivery_status_enum"]>
      | undefined
      | null
      | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _neq?:
      | ValueTypes["order_delivery_status_enum"]
      | undefined
      | null
      | Variable<any, string>;
    _nin?:
      | Array<ValueTypes["order_delivery_status_enum"]>
      | undefined
      | null
      | Variable<any, string>;
  };
  /** input type for inserting data into table "order_delivery_status" */
  ["order_delivery_status_insert_input"]: {
    value?: string | undefined | null | Variable<any, string>;
  };
  /** aggregate max on columns */
  ["order_delivery_status_max_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["order_delivery_status_min_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "order_delivery_status" */
  ["order_delivery_status_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ValueTypes["order_delivery_status"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "order_delivery_status" */
  ["order_delivery_status_on_conflict"]: {
    constraint:
      | ValueTypes["order_delivery_status_constraint"]
      | Variable<any, string>;
    update_columns:
      | Array<ValueTypes["order_delivery_status_update_column"]>
      | Variable<any, string>;
    where?:
      | ValueTypes["order_delivery_status_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Ordering options when selecting data from "order_delivery_status". */
  ["order_delivery_status_order_by"]: {
    value?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** primary key columns input for table: order_delivery_status */
  ["order_delivery_status_pk_columns_input"]: {
    value: string | Variable<any, string>;
  };
  /** select columns of table "order_delivery_status" */
  ["order_delivery_status_select_column"]: order_delivery_status_select_column;
  /** input type for updating data in table "order_delivery_status" */
  ["order_delivery_status_set_input"]: {
    value?: string | undefined | null | Variable<any, string>;
  };
  /** Streaming cursor of the table "order_delivery_status" */
  ["order_delivery_status_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value:
      | ValueTypes["order_delivery_status_stream_cursor_value_input"]
      | Variable<any, string>;
    /** cursor ordering */
    ordering?:
      | ValueTypes["cursor_ordering"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Initial value of the column from where the streaming should start */
  ["order_delivery_status_stream_cursor_value_input"]: {
    value?: string | undefined | null | Variable<any, string>;
  };
  /** update columns of table "order_delivery_status" */
  ["order_delivery_status_update_column"]: order_delivery_status_update_column;
  ["order_delivery_status_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ValueTypes["order_delivery_status_set_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** filter the rows which have to be updated */
    where: ValueTypes["order_delivery_status_bool_exp"] | Variable<any, string>;
  };
  /** columns and relationships of "orders" */
  ["orders"]: AliasType<{
    created_at?: boolean | `@${string}`;
    deliveredAt?: boolean | `@${string}`;
    delivery_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    status?: boolean | `@${string}`;
    subscription_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "orders" */
  ["orders_aggregate"]: AliasType<{
    aggregate?: ValueTypes["orders_aggregate_fields"];
    nodes?: ValueTypes["orders"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "orders" */
  ["orders_aggregate_fields"]: AliasType<{
    avg?: ValueTypes["orders_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ValueTypes["orders_select_column"]>
          | undefined
          | null
          | Variable<any, string>;
        distinct?: boolean | undefined | null | Variable<any, string>;
      },
      boolean | `@${string}`
    ];
    max?: ValueTypes["orders_max_fields"];
    min?: ValueTypes["orders_min_fields"];
    stddev?: ValueTypes["orders_stddev_fields"];
    stddev_pop?: ValueTypes["orders_stddev_pop_fields"];
    stddev_samp?: ValueTypes["orders_stddev_samp_fields"];
    sum?: ValueTypes["orders_sum_fields"];
    var_pop?: ValueTypes["orders_var_pop_fields"];
    var_samp?: ValueTypes["orders_var_samp_fields"];
    variance?: ValueTypes["orders_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate avg on columns */
  ["orders_avg_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "orders". All fields are combined with a logical 'AND'. */
  ["orders_bool_exp"]: {
    _and?:
      | Array<ValueTypes["orders_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    _not?:
      | ValueTypes["orders_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    _or?:
      | Array<ValueTypes["orders_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    created_at?:
      | ValueTypes["timestamptz_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    deliveredAt?:
      | ValueTypes["timestamptz_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    delivery_date?:
      | ValueTypes["date_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    id?:
      | ValueTypes["uuid_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    meal_id?:
      | ValueTypes["Int_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    slot_id?:
      | ValueTypes["Int_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    status?:
      | ValueTypes["order_delivery_status_enum_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_id?:
      | ValueTypes["uuid_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** unique or primary key constraints on table "orders" */
  ["orders_constraint"]: orders_constraint;
  /** input type for incrementing numeric columns in table "orders" */
  ["orders_inc_input"]: {
    meal_id?: number | undefined | null | Variable<any, string>;
    slot_id?: number | undefined | null | Variable<any, string>;
  };
  /** input type for inserting data into table "orders" */
  ["orders_insert_input"]: {
    created_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    deliveredAt?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    delivery_date?:
      | ValueTypes["date"]
      | undefined
      | null
      | Variable<any, string>;
    id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    meal_id?: number | undefined | null | Variable<any, string>;
    slot_id?: number | undefined | null | Variable<any, string>;
    status?:
      | ValueTypes["order_delivery_status_enum"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_id?:
      | ValueTypes["uuid"]
      | undefined
      | null
      | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate max on columns */
  ["orders_max_fields"]: AliasType<{
    created_at?: boolean | `@${string}`;
    deliveredAt?: boolean | `@${string}`;
    delivery_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    subscription_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["orders_min_fields"]: AliasType<{
    created_at?: boolean | `@${string}`;
    deliveredAt?: boolean | `@${string}`;
    delivery_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    subscription_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "orders" */
  ["orders_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ValueTypes["orders"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "orders" */
  ["orders_on_conflict"]: {
    constraint: ValueTypes["orders_constraint"] | Variable<any, string>;
    update_columns:
      | Array<ValueTypes["orders_update_column"]>
      | Variable<any, string>;
    where?:
      | ValueTypes["orders_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Ordering options when selecting data from "orders". */
  ["orders_order_by"]: {
    created_at?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    deliveredAt?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    delivery_date?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    meal_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    slot_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    status?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    subscription_id?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    updated_at?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** primary key columns input for table: orders */
  ["orders_pk_columns_input"]: {
    id: ValueTypes["uuid"] | Variable<any, string>;
  };
  /** select columns of table "orders" */
  ["orders_select_column"]: orders_select_column;
  /** input type for updating data in table "orders" */
  ["orders_set_input"]: {
    created_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    deliveredAt?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    delivery_date?:
      | ValueTypes["date"]
      | undefined
      | null
      | Variable<any, string>;
    id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    meal_id?: number | undefined | null | Variable<any, string>;
    slot_id?: number | undefined | null | Variable<any, string>;
    status?:
      | ValueTypes["order_delivery_status_enum"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_id?:
      | ValueTypes["uuid"]
      | undefined
      | null
      | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate stddev on columns */
  ["orders_stddev_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_pop on columns */
  ["orders_stddev_pop_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_samp on columns */
  ["orders_stddev_samp_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Streaming cursor of the table "orders" */
  ["orders_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value:
      | ValueTypes["orders_stream_cursor_value_input"]
      | Variable<any, string>;
    /** cursor ordering */
    ordering?:
      | ValueTypes["cursor_ordering"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Initial value of the column from where the streaming should start */
  ["orders_stream_cursor_value_input"]: {
    created_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    deliveredAt?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    delivery_date?:
      | ValueTypes["date"]
      | undefined
      | null
      | Variable<any, string>;
    id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    meal_id?: number | undefined | null | Variable<any, string>;
    slot_id?: number | undefined | null | Variable<any, string>;
    status?:
      | ValueTypes["order_delivery_status_enum"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_id?:
      | ValueTypes["uuid"]
      | undefined
      | null
      | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate sum on columns */
  ["orders_sum_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** update columns of table "orders" */
  ["orders_update_column"]: orders_update_column;
  ["orders_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?:
      | ValueTypes["orders_inc_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ValueTypes["orders_set_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** filter the rows which have to be updated */
    where: ValueTypes["orders_bool_exp"] | Variable<any, string>;
  };
  /** aggregate var_pop on columns */
  ["orders_var_pop_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate var_samp on columns */
  ["orders_var_samp_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate variance on columns */
  ["orders_variance_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  ["query_root"]: AliasType<{
    meals?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["meals_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["meals_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["meals_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["meals"]
    ];
    meals_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["meals_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["meals_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["meals_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["meals_aggregate"]
    ];
    meals_by_pk?: [{ id: number | Variable<any, string> }, ValueTypes["meals"]];
    order_delivery_status?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["order_delivery_status_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["order_delivery_status_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["order_delivery_status_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status"]
    ];
    order_delivery_status_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["order_delivery_status_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["order_delivery_status_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["order_delivery_status_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status_aggregate"]
    ];
    order_delivery_status_by_pk?: [
      { value: string | Variable<any, string> },
      ValueTypes["order_delivery_status"]
    ];
    orders?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["orders_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["orders_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["orders_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["orders"]
    ];
    orders_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["orders_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["orders_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["orders_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["orders_aggregate"]
    ];
    orders_by_pk?: [
      { id: ValueTypes["uuid"] | Variable<any, string> },
      ValueTypes["orders"]
    ];
    slots?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["slots_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["slots_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["slots_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["slots"]
    ];
    slots_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["slots_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["slots_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["slots_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["slots_aggregate"]
    ];
    slots_by_pk?: [{ id: number | Variable<any, string> }, ValueTypes["slots"]];
    subscription_plan_frequency?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plan_frequency_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plan_frequency_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency"]
    ];
    subscription_plan_frequency_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plan_frequency_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plan_frequency_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency_aggregate"]
    ];
    subscription_plan_frequency_by_pk?: [
      { value: string | Variable<any, string> },
      ValueTypes["subscription_plan_frequency"]
    ];
    subscription_plan_type?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plan_type_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plan_type_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type"]
    ];
    subscription_plan_type_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plan_type_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plan_type_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type_aggregate"]
    ];
    subscription_plan_type_by_pk?: [
      { value: string | Variable<any, string> },
      ValueTypes["subscription_plan_type"]
    ];
    subscription_plans?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plans_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plans_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plans_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans"]
    ];
    subscription_plans_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plans_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plans_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plans_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans_aggregate"]
    ];
    subscription_plans_by_pk?: [
      { id: number | Variable<any, string> },
      ValueTypes["subscription_plans"]
    ];
    subscriptions?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscriptions_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscriptions_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscriptions_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscriptions"]
    ];
    subscriptions_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscriptions_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscriptions_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscriptions_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscriptions_aggregate"]
    ];
    subscriptions_by_pk?: [
      { id: ValueTypes["uuid"] | Variable<any, string> },
      ValueTypes["subscriptions"]
    ];
    users?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["users_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["users_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["users_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["users"]
    ];
    users_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["users_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["users_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["users_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["users_aggregate"]
    ];
    users_by_pk?: [
      { id: ValueTypes["uuid"] | Variable<any, string> },
      ValueTypes["users"]
    ];
    __typename?: boolean | `@${string}`;
  }>;
  /** columns and relationships of "slots" */
  ["slots"]: AliasType<{
    from?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    to?: boolean | `@${string}`;
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "slots" */
  ["slots_aggregate"]: AliasType<{
    aggregate?: ValueTypes["slots_aggregate_fields"];
    nodes?: ValueTypes["slots"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "slots" */
  ["slots_aggregate_fields"]: AliasType<{
    avg?: ValueTypes["slots_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ValueTypes["slots_select_column"]>
          | undefined
          | null
          | Variable<any, string>;
        distinct?: boolean | undefined | null | Variable<any, string>;
      },
      boolean | `@${string}`
    ];
    max?: ValueTypes["slots_max_fields"];
    min?: ValueTypes["slots_min_fields"];
    stddev?: ValueTypes["slots_stddev_fields"];
    stddev_pop?: ValueTypes["slots_stddev_pop_fields"];
    stddev_samp?: ValueTypes["slots_stddev_samp_fields"];
    sum?: ValueTypes["slots_sum_fields"];
    var_pop?: ValueTypes["slots_var_pop_fields"];
    var_samp?: ValueTypes["slots_var_samp_fields"];
    variance?: ValueTypes["slots_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate avg on columns */
  ["slots_avg_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "slots". All fields are combined with a logical 'AND'. */
  ["slots_bool_exp"]: {
    _and?:
      | Array<ValueTypes["slots_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    _not?:
      | ValueTypes["slots_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    _or?:
      | Array<ValueTypes["slots_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    from?:
      | ValueTypes["time_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    id?:
      | ValueTypes["Int_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    to?:
      | ValueTypes["timetz_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    type?:
      | ValueTypes["subscription_plan_frequency_enum_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** unique or primary key constraints on table "slots" */
  ["slots_constraint"]: slots_constraint;
  /** input type for incrementing numeric columns in table "slots" */
  ["slots_inc_input"]: {
    id?: number | undefined | null | Variable<any, string>;
  };
  /** input type for inserting data into table "slots" */
  ["slots_insert_input"]: {
    from?: ValueTypes["time"] | undefined | null | Variable<any, string>;
    id?: number | undefined | null | Variable<any, string>;
    to?: ValueTypes["timetz"] | undefined | null | Variable<any, string>;
    type?:
      | ValueTypes["subscription_plan_frequency_enum"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate max on columns */
  ["slots_max_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    to?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["slots_min_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    to?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "slots" */
  ["slots_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ValueTypes["slots"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "slots" */
  ["slots_on_conflict"]: {
    constraint: ValueTypes["slots_constraint"] | Variable<any, string>;
    update_columns:
      | Array<ValueTypes["slots_update_column"]>
      | Variable<any, string>;
    where?:
      | ValueTypes["slots_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Ordering options when selecting data from "slots". */
  ["slots_order_by"]: {
    from?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    to?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    type?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** primary key columns input for table: slots */
  ["slots_pk_columns_input"]: {
    id: number | Variable<any, string>;
  };
  /** select columns of table "slots" */
  ["slots_select_column"]: slots_select_column;
  /** input type for updating data in table "slots" */
  ["slots_set_input"]: {
    from?: ValueTypes["time"] | undefined | null | Variable<any, string>;
    id?: number | undefined | null | Variable<any, string>;
    to?: ValueTypes["timetz"] | undefined | null | Variable<any, string>;
    type?:
      | ValueTypes["subscription_plan_frequency_enum"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate stddev on columns */
  ["slots_stddev_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_pop on columns */
  ["slots_stddev_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_samp on columns */
  ["slots_stddev_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Streaming cursor of the table "slots" */
  ["slots_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value:
      | ValueTypes["slots_stream_cursor_value_input"]
      | Variable<any, string>;
    /** cursor ordering */
    ordering?:
      | ValueTypes["cursor_ordering"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Initial value of the column from where the streaming should start */
  ["slots_stream_cursor_value_input"]: {
    from?: ValueTypes["time"] | undefined | null | Variable<any, string>;
    id?: number | undefined | null | Variable<any, string>;
    to?: ValueTypes["timetz"] | undefined | null | Variable<any, string>;
    type?:
      | ValueTypes["subscription_plan_frequency_enum"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate sum on columns */
  ["slots_sum_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** update columns of table "slots" */
  ["slots_update_column"]: slots_update_column;
  ["slots_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?:
      | ValueTypes["slots_inc_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ValueTypes["slots_set_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** filter the rows which have to be updated */
    where: ValueTypes["slots_bool_exp"] | Variable<any, string>;
  };
  /** aggregate var_pop on columns */
  ["slots_var_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate var_samp on columns */
  ["slots_var_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate variance on columns */
  ["slots_variance_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** columns and relationships of "subscription_plan_frequency" */
  ["subscription_plan_frequency"]: AliasType<{
    subscription_plans?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plans_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plans_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plans_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans"]
    ];
    subscription_plans_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plans_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plans_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plans_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans_aggregate"]
    ];
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "subscription_plan_frequency" */
  ["subscription_plan_frequency_aggregate"]: AliasType<{
    aggregate?: ValueTypes["subscription_plan_frequency_aggregate_fields"];
    nodes?: ValueTypes["subscription_plan_frequency"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "subscription_plan_frequency" */
  ["subscription_plan_frequency_aggregate_fields"]: AliasType<{
    count?: [
      {
        columns?:
          | Array<ValueTypes["subscription_plan_frequency_select_column"]>
          | undefined
          | null
          | Variable<any, string>;
        distinct?: boolean | undefined | null | Variable<any, string>;
      },
      boolean | `@${string}`
    ];
    max?: ValueTypes["subscription_plan_frequency_max_fields"];
    min?: ValueTypes["subscription_plan_frequency_min_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "subscription_plan_frequency". All fields are combined with a logical 'AND'. */
  ["subscription_plan_frequency_bool_exp"]: {
    _and?:
      | Array<ValueTypes["subscription_plan_frequency_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    _not?:
      | ValueTypes["subscription_plan_frequency_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    _or?:
      | Array<ValueTypes["subscription_plan_frequency_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    subscription_plans?:
      | ValueTypes["subscription_plans_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_plans_aggregate?:
      | ValueTypes["subscription_plans_aggregate_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    value?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** unique or primary key constraints on table "subscription_plan_frequency" */
  ["subscription_plan_frequency_constraint"]: subscription_plan_frequency_constraint;
  ["subscription_plan_frequency_enum"]: subscription_plan_frequency_enum;
  /** Boolean expression to compare columns of type "subscription_plan_frequency_enum". All fields are combined with logical 'AND'. */
  ["subscription_plan_frequency_enum_comparison_exp"]: {
    _eq?:
      | ValueTypes["subscription_plan_frequency_enum"]
      | undefined
      | null
      | Variable<any, string>;
    _in?:
      | Array<ValueTypes["subscription_plan_frequency_enum"]>
      | undefined
      | null
      | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _neq?:
      | ValueTypes["subscription_plan_frequency_enum"]
      | undefined
      | null
      | Variable<any, string>;
    _nin?:
      | Array<ValueTypes["subscription_plan_frequency_enum"]>
      | undefined
      | null
      | Variable<any, string>;
  };
  /** input type for inserting data into table "subscription_plan_frequency" */
  ["subscription_plan_frequency_insert_input"]: {
    subscription_plans?:
      | ValueTypes["subscription_plans_arr_rel_insert_input"]
      | undefined
      | null
      | Variable<any, string>;
    value?: string | undefined | null | Variable<any, string>;
  };
  /** aggregate max on columns */
  ["subscription_plan_frequency_max_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["subscription_plan_frequency_min_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "subscription_plan_frequency" */
  ["subscription_plan_frequency_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ValueTypes["subscription_plan_frequency"];
    __typename?: boolean | `@${string}`;
  }>;
  /** input type for inserting object relation for remote table "subscription_plan_frequency" */
  ["subscription_plan_frequency_obj_rel_insert_input"]: {
    data:
      | ValueTypes["subscription_plan_frequency_insert_input"]
      | Variable<any, string>;
    /** upsert condition */
    on_conflict?:
      | ValueTypes["subscription_plan_frequency_on_conflict"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** on_conflict condition type for table "subscription_plan_frequency" */
  ["subscription_plan_frequency_on_conflict"]: {
    constraint:
      | ValueTypes["subscription_plan_frequency_constraint"]
      | Variable<any, string>;
    update_columns:
      | Array<ValueTypes["subscription_plan_frequency_update_column"]>
      | Variable<any, string>;
    where?:
      | ValueTypes["subscription_plan_frequency_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Ordering options when selecting data from "subscription_plan_frequency". */
  ["subscription_plan_frequency_order_by"]: {
    subscription_plans_aggregate?:
      | ValueTypes["subscription_plans_aggregate_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    value?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** primary key columns input for table: subscription_plan_frequency */
  ["subscription_plan_frequency_pk_columns_input"]: {
    value: string | Variable<any, string>;
  };
  /** select columns of table "subscription_plan_frequency" */
  ["subscription_plan_frequency_select_column"]: subscription_plan_frequency_select_column;
  /** input type for updating data in table "subscription_plan_frequency" */
  ["subscription_plan_frequency_set_input"]: {
    value?: string | undefined | null | Variable<any, string>;
  };
  /** Streaming cursor of the table "subscription_plan_frequency" */
  ["subscription_plan_frequency_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value:
      | ValueTypes["subscription_plan_frequency_stream_cursor_value_input"]
      | Variable<any, string>;
    /** cursor ordering */
    ordering?:
      | ValueTypes["cursor_ordering"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plan_frequency_stream_cursor_value_input"]: {
    value?: string | undefined | null | Variable<any, string>;
  };
  /** update columns of table "subscription_plan_frequency" */
  ["subscription_plan_frequency_update_column"]: subscription_plan_frequency_update_column;
  ["subscription_plan_frequency_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ValueTypes["subscription_plan_frequency_set_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** filter the rows which have to be updated */
    where:
      | ValueTypes["subscription_plan_frequency_bool_exp"]
      | Variable<any, string>;
  };
  /** columns and relationships of "subscription_plan_type" */
  ["subscription_plan_type"]: AliasType<{
    subscription_plans?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plans_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plans_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plans_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans"]
    ];
    subscription_plans_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plans_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plans_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plans_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans_aggregate"]
    ];
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "subscription_plan_type" */
  ["subscription_plan_type_aggregate"]: AliasType<{
    aggregate?: ValueTypes["subscription_plan_type_aggregate_fields"];
    nodes?: ValueTypes["subscription_plan_type"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "subscription_plan_type" */
  ["subscription_plan_type_aggregate_fields"]: AliasType<{
    count?: [
      {
        columns?:
          | Array<ValueTypes["subscription_plan_type_select_column"]>
          | undefined
          | null
          | Variable<any, string>;
        distinct?: boolean | undefined | null | Variable<any, string>;
      },
      boolean | `@${string}`
    ];
    max?: ValueTypes["subscription_plan_type_max_fields"];
    min?: ValueTypes["subscription_plan_type_min_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "subscription_plan_type". All fields are combined with a logical 'AND'. */
  ["subscription_plan_type_bool_exp"]: {
    _and?:
      | Array<ValueTypes["subscription_plan_type_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    _not?:
      | ValueTypes["subscription_plan_type_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    _or?:
      | Array<ValueTypes["subscription_plan_type_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    subscription_plans?:
      | ValueTypes["subscription_plans_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_plans_aggregate?:
      | ValueTypes["subscription_plans_aggregate_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    value?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** unique or primary key constraints on table "subscription_plan_type" */
  ["subscription_plan_type_constraint"]: subscription_plan_type_constraint;
  ["subscription_plan_type_enum"]: subscription_plan_type_enum;
  /** Boolean expression to compare columns of type "subscription_plan_type_enum". All fields are combined with logical 'AND'. */
  ["subscription_plan_type_enum_comparison_exp"]: {
    _eq?:
      | ValueTypes["subscription_plan_type_enum"]
      | undefined
      | null
      | Variable<any, string>;
    _in?:
      | Array<ValueTypes["subscription_plan_type_enum"]>
      | undefined
      | null
      | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _neq?:
      | ValueTypes["subscription_plan_type_enum"]
      | undefined
      | null
      | Variable<any, string>;
    _nin?:
      | Array<ValueTypes["subscription_plan_type_enum"]>
      | undefined
      | null
      | Variable<any, string>;
  };
  /** input type for inserting data into table "subscription_plan_type" */
  ["subscription_plan_type_insert_input"]: {
    subscription_plans?:
      | ValueTypes["subscription_plans_arr_rel_insert_input"]
      | undefined
      | null
      | Variable<any, string>;
    value?: string | undefined | null | Variable<any, string>;
  };
  /** aggregate max on columns */
  ["subscription_plan_type_max_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["subscription_plan_type_min_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "subscription_plan_type" */
  ["subscription_plan_type_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ValueTypes["subscription_plan_type"];
    __typename?: boolean | `@${string}`;
  }>;
  /** input type for inserting object relation for remote table "subscription_plan_type" */
  ["subscription_plan_type_obj_rel_insert_input"]: {
    data:
      | ValueTypes["subscription_plan_type_insert_input"]
      | Variable<any, string>;
    /** upsert condition */
    on_conflict?:
      | ValueTypes["subscription_plan_type_on_conflict"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** on_conflict condition type for table "subscription_plan_type" */
  ["subscription_plan_type_on_conflict"]: {
    constraint:
      | ValueTypes["subscription_plan_type_constraint"]
      | Variable<any, string>;
    update_columns:
      | Array<ValueTypes["subscription_plan_type_update_column"]>
      | Variable<any, string>;
    where?:
      | ValueTypes["subscription_plan_type_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Ordering options when selecting data from "subscription_plan_type". */
  ["subscription_plan_type_order_by"]: {
    subscription_plans_aggregate?:
      | ValueTypes["subscription_plans_aggregate_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    value?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** primary key columns input for table: subscription_plan_type */
  ["subscription_plan_type_pk_columns_input"]: {
    value: string | Variable<any, string>;
  };
  /** select columns of table "subscription_plan_type" */
  ["subscription_plan_type_select_column"]: subscription_plan_type_select_column;
  /** input type for updating data in table "subscription_plan_type" */
  ["subscription_plan_type_set_input"]: {
    value?: string | undefined | null | Variable<any, string>;
  };
  /** Streaming cursor of the table "subscription_plan_type" */
  ["subscription_plan_type_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value:
      | ValueTypes["subscription_plan_type_stream_cursor_value_input"]
      | Variable<any, string>;
    /** cursor ordering */
    ordering?:
      | ValueTypes["cursor_ordering"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plan_type_stream_cursor_value_input"]: {
    value?: string | undefined | null | Variable<any, string>;
  };
  /** update columns of table "subscription_plan_type" */
  ["subscription_plan_type_update_column"]: subscription_plan_type_update_column;
  ["subscription_plan_type_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ValueTypes["subscription_plan_type_set_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** filter the rows which have to be updated */
    where:
      | ValueTypes["subscription_plan_type_bool_exp"]
      | Variable<any, string>;
  };
  /** columns and relationships of "subscription_plans" */
  ["subscription_plans"]: AliasType<{
    frequency?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    is_non_veg?: boolean | `@${string}`;
    price?: boolean | `@${string}`;
    /** An object relationship */
    subscription_plan_frequency?: ValueTypes["subscription_plan_frequency"];
    /** An object relationship */
    subscription_plan_type?: ValueTypes["subscription_plan_type"];
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "subscription_plans" */
  ["subscription_plans_aggregate"]: AliasType<{
    aggregate?: ValueTypes["subscription_plans_aggregate_fields"];
    nodes?: ValueTypes["subscription_plans"];
    __typename?: boolean | `@${string}`;
  }>;
  ["subscription_plans_aggregate_bool_exp"]: {
    bool_and?:
      | ValueTypes["subscription_plans_aggregate_bool_exp_bool_and"]
      | undefined
      | null
      | Variable<any, string>;
    bool_or?:
      | ValueTypes["subscription_plans_aggregate_bool_exp_bool_or"]
      | undefined
      | null
      | Variable<any, string>;
    count?:
      | ValueTypes["subscription_plans_aggregate_bool_exp_count"]
      | undefined
      | null
      | Variable<any, string>;
  };
  ["subscription_plans_aggregate_bool_exp_bool_and"]: {
    arguments:
      | ValueTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"]
      | Variable<any, string>;
    distinct?: boolean | undefined | null | Variable<any, string>;
    filter?:
      | ValueTypes["subscription_plans_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    predicate: ValueTypes["Boolean_comparison_exp"] | Variable<any, string>;
  };
  ["subscription_plans_aggregate_bool_exp_bool_or"]: {
    arguments:
      | ValueTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"]
      | Variable<any, string>;
    distinct?: boolean | undefined | null | Variable<any, string>;
    filter?:
      | ValueTypes["subscription_plans_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    predicate: ValueTypes["Boolean_comparison_exp"] | Variable<any, string>;
  };
  ["subscription_plans_aggregate_bool_exp_count"]: {
    arguments?:
      | Array<ValueTypes["subscription_plans_select_column"]>
      | undefined
      | null
      | Variable<any, string>;
    distinct?: boolean | undefined | null | Variable<any, string>;
    filter?:
      | ValueTypes["subscription_plans_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    predicate: ValueTypes["Int_comparison_exp"] | Variable<any, string>;
  };
  /** aggregate fields of "subscription_plans" */
  ["subscription_plans_aggregate_fields"]: AliasType<{
    avg?: ValueTypes["subscription_plans_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ValueTypes["subscription_plans_select_column"]>
          | undefined
          | null
          | Variable<any, string>;
        distinct?: boolean | undefined | null | Variable<any, string>;
      },
      boolean | `@${string}`
    ];
    max?: ValueTypes["subscription_plans_max_fields"];
    min?: ValueTypes["subscription_plans_min_fields"];
    stddev?: ValueTypes["subscription_plans_stddev_fields"];
    stddev_pop?: ValueTypes["subscription_plans_stddev_pop_fields"];
    stddev_samp?: ValueTypes["subscription_plans_stddev_samp_fields"];
    sum?: ValueTypes["subscription_plans_sum_fields"];
    var_pop?: ValueTypes["subscription_plans_var_pop_fields"];
    var_samp?: ValueTypes["subscription_plans_var_samp_fields"];
    variance?: ValueTypes["subscription_plans_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** order by aggregate values of table "subscription_plans" */
  ["subscription_plans_aggregate_order_by"]: {
    avg?:
      | ValueTypes["subscription_plans_avg_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    count?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    max?:
      | ValueTypes["subscription_plans_max_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    min?:
      | ValueTypes["subscription_plans_min_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    stddev?:
      | ValueTypes["subscription_plans_stddev_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    stddev_pop?:
      | ValueTypes["subscription_plans_stddev_pop_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    stddev_samp?:
      | ValueTypes["subscription_plans_stddev_samp_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    sum?:
      | ValueTypes["subscription_plans_sum_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    var_pop?:
      | ValueTypes["subscription_plans_var_pop_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    var_samp?:
      | ValueTypes["subscription_plans_var_samp_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    variance?:
      | ValueTypes["subscription_plans_variance_order_by"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** input type for inserting array relation for remote table "subscription_plans" */
  ["subscription_plans_arr_rel_insert_input"]: {
    data:
      | Array<ValueTypes["subscription_plans_insert_input"]>
      | Variable<any, string>;
    /** upsert condition */
    on_conflict?:
      | ValueTypes["subscription_plans_on_conflict"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate avg on columns */
  ["subscription_plans_avg_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by avg() on columns of table "subscription_plans" */
  ["subscription_plans_avg_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** Boolean expression to filter rows from the table "subscription_plans". All fields are combined with a logical 'AND'. */
  ["subscription_plans_bool_exp"]: {
    _and?:
      | Array<ValueTypes["subscription_plans_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    _not?:
      | ValueTypes["subscription_plans_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    _or?:
      | Array<ValueTypes["subscription_plans_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    frequency?:
      | ValueTypes["subscription_plan_frequency_enum_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    id?:
      | ValueTypes["Int_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    is_non_veg?:
      | ValueTypes["Boolean_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    price?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_plan_frequency?:
      | ValueTypes["subscription_plan_frequency_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_plan_type?:
      | ValueTypes["subscription_plan_type_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    type?:
      | ValueTypes["subscription_plan_type_enum_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** unique or primary key constraints on table "subscription_plans" */
  ["subscription_plans_constraint"]: subscription_plans_constraint;
  /** input type for incrementing numeric columns in table "subscription_plans" */
  ["subscription_plans_inc_input"]: {
    id?: number | undefined | null | Variable<any, string>;
  };
  /** input type for inserting data into table "subscription_plans" */
  ["subscription_plans_insert_input"]: {
    frequency?:
      | ValueTypes["subscription_plan_frequency_enum"]
      | undefined
      | null
      | Variable<any, string>;
    id?: number | undefined | null | Variable<any, string>;
    is_non_veg?: boolean | undefined | null | Variable<any, string>;
    price?: string | undefined | null | Variable<any, string>;
    subscription_plan_frequency?:
      | ValueTypes["subscription_plan_frequency_obj_rel_insert_input"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_plan_type?:
      | ValueTypes["subscription_plan_type_obj_rel_insert_input"]
      | undefined
      | null
      | Variable<any, string>;
    type?:
      | ValueTypes["subscription_plan_type_enum"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate max on columns */
  ["subscription_plans_max_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    price?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by max() on columns of table "subscription_plans" */
  ["subscription_plans_max_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    price?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** aggregate min on columns */
  ["subscription_plans_min_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    price?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by min() on columns of table "subscription_plans" */
  ["subscription_plans_min_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    price?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** response of any mutation on the table "subscription_plans" */
  ["subscription_plans_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ValueTypes["subscription_plans"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "subscription_plans" */
  ["subscription_plans_on_conflict"]: {
    constraint:
      | ValueTypes["subscription_plans_constraint"]
      | Variable<any, string>;
    update_columns:
      | Array<ValueTypes["subscription_plans_update_column"]>
      | Variable<any, string>;
    where?:
      | ValueTypes["subscription_plans_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Ordering options when selecting data from "subscription_plans". */
  ["subscription_plans_order_by"]: {
    frequency?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    is_non_veg?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    price?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    subscription_plan_frequency?:
      | ValueTypes["subscription_plan_frequency_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_plan_type?:
      | ValueTypes["subscription_plan_type_order_by"]
      | undefined
      | null
      | Variable<any, string>;
    type?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** primary key columns input for table: subscription_plans */
  ["subscription_plans_pk_columns_input"]: {
    id: number | Variable<any, string>;
  };
  /** select columns of table "subscription_plans" */
  ["subscription_plans_select_column"]: subscription_plans_select_column;
  /** select "subscription_plans_aggregate_bool_exp_bool_and_arguments_columns" columns of table "subscription_plans" */
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"]: subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns;
  /** select "subscription_plans_aggregate_bool_exp_bool_or_arguments_columns" columns of table "subscription_plans" */
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"]: subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns;
  /** input type for updating data in table "subscription_plans" */
  ["subscription_plans_set_input"]: {
    frequency?:
      | ValueTypes["subscription_plan_frequency_enum"]
      | undefined
      | null
      | Variable<any, string>;
    id?: number | undefined | null | Variable<any, string>;
    is_non_veg?: boolean | undefined | null | Variable<any, string>;
    price?: string | undefined | null | Variable<any, string>;
    type?:
      | ValueTypes["subscription_plan_type_enum"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate stddev on columns */
  ["subscription_plans_stddev_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by stddev() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** aggregate stddev_pop on columns */
  ["subscription_plans_stddev_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by stddev_pop() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_pop_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** aggregate stddev_samp on columns */
  ["subscription_plans_stddev_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by stddev_samp() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_samp_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** Streaming cursor of the table "subscription_plans" */
  ["subscription_plans_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value:
      | ValueTypes["subscription_plans_stream_cursor_value_input"]
      | Variable<any, string>;
    /** cursor ordering */
    ordering?:
      | ValueTypes["cursor_ordering"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plans_stream_cursor_value_input"]: {
    frequency?:
      | ValueTypes["subscription_plan_frequency_enum"]
      | undefined
      | null
      | Variable<any, string>;
    id?: number | undefined | null | Variable<any, string>;
    is_non_veg?: boolean | undefined | null | Variable<any, string>;
    price?: string | undefined | null | Variable<any, string>;
    type?:
      | ValueTypes["subscription_plan_type_enum"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** aggregate sum on columns */
  ["subscription_plans_sum_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by sum() on columns of table "subscription_plans" */
  ["subscription_plans_sum_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** update columns of table "subscription_plans" */
  ["subscription_plans_update_column"]: subscription_plans_update_column;
  ["subscription_plans_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?:
      | ValueTypes["subscription_plans_inc_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ValueTypes["subscription_plans_set_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** filter the rows which have to be updated */
    where: ValueTypes["subscription_plans_bool_exp"] | Variable<any, string>;
  };
  /** aggregate var_pop on columns */
  ["subscription_plans_var_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by var_pop() on columns of table "subscription_plans" */
  ["subscription_plans_var_pop_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** aggregate var_samp on columns */
  ["subscription_plans_var_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by var_samp() on columns of table "subscription_plans" */
  ["subscription_plans_var_samp_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** aggregate variance on columns */
  ["subscription_plans_variance_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by variance() on columns of table "subscription_plans" */
  ["subscription_plans_variance_order_by"]: {
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  ["subscription_root"]: AliasType<{
    meals?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["meals_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["meals_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["meals_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["meals"]
    ];
    meals_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["meals_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["meals_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["meals_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["meals_aggregate"]
    ];
    meals_by_pk?: [{ id: number | Variable<any, string> }, ValueTypes["meals"]];
    meals_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size:
          | number
          | Variable<
              any,
              string
            > /** cursor to stream the results returned by the query */;
        cursor:
          | Array<ValueTypes["meals_stream_cursor_input"] | undefined | null>
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["meals_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["meals"]
    ];
    order_delivery_status?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["order_delivery_status_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["order_delivery_status_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["order_delivery_status_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status"]
    ];
    order_delivery_status_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["order_delivery_status_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["order_delivery_status_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["order_delivery_status_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status_aggregate"]
    ];
    order_delivery_status_by_pk?: [
      { value: string | Variable<any, string> },
      ValueTypes["order_delivery_status"]
    ];
    order_delivery_status_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size:
          | number
          | Variable<
              any,
              string
            > /** cursor to stream the results returned by the query */;
        cursor:
          | Array<
              | ValueTypes["order_delivery_status_stream_cursor_input"]
              | undefined
              | null
            >
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["order_delivery_status_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["order_delivery_status"]
    ];
    orders?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["orders_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["orders_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["orders_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["orders"]
    ];
    orders_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["orders_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["orders_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["orders_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["orders_aggregate"]
    ];
    orders_by_pk?: [
      { id: ValueTypes["uuid"] | Variable<any, string> },
      ValueTypes["orders"]
    ];
    orders_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size:
          | number
          | Variable<
              any,
              string
            > /** cursor to stream the results returned by the query */;
        cursor:
          | Array<ValueTypes["orders_stream_cursor_input"] | undefined | null>
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["orders_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["orders"]
    ];
    slots?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["slots_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["slots_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["slots_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["slots"]
    ];
    slots_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["slots_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["slots_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["slots_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["slots_aggregate"]
    ];
    slots_by_pk?: [{ id: number | Variable<any, string> }, ValueTypes["slots"]];
    slots_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size:
          | number
          | Variable<
              any,
              string
            > /** cursor to stream the results returned by the query */;
        cursor:
          | Array<ValueTypes["slots_stream_cursor_input"] | undefined | null>
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["slots_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["slots"]
    ];
    subscription_plan_frequency?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plan_frequency_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plan_frequency_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency"]
    ];
    subscription_plan_frequency_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plan_frequency_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plan_frequency_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency_aggregate"]
    ];
    subscription_plan_frequency_by_pk?: [
      { value: string | Variable<any, string> },
      ValueTypes["subscription_plan_frequency"]
    ];
    subscription_plan_frequency_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size:
          | number
          | Variable<
              any,
              string
            > /** cursor to stream the results returned by the query */;
        cursor:
          | Array<
              | ValueTypes["subscription_plan_frequency_stream_cursor_input"]
              | undefined
              | null
            >
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_frequency"]
    ];
    subscription_plan_type?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plan_type_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plan_type_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type"]
    ];
    subscription_plan_type_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plan_type_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plan_type_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type_aggregate"]
    ];
    subscription_plan_type_by_pk?: [
      { value: string | Variable<any, string> },
      ValueTypes["subscription_plan_type"]
    ];
    subscription_plan_type_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size:
          | number
          | Variable<
              any,
              string
            > /** cursor to stream the results returned by the query */;
        cursor:
          | Array<
              | ValueTypes["subscription_plan_type_stream_cursor_input"]
              | undefined
              | null
            >
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plan_type"]
    ];
    subscription_plans?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plans_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plans_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plans_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans"]
    ];
    subscription_plans_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscription_plans_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscription_plans_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plans_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans_aggregate"]
    ];
    subscription_plans_by_pk?: [
      { id: number | Variable<any, string> },
      ValueTypes["subscription_plans"]
    ];
    subscription_plans_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size:
          | number
          | Variable<
              any,
              string
            > /** cursor to stream the results returned by the query */;
        cursor:
          | Array<
              | ValueTypes["subscription_plans_stream_cursor_input"]
              | undefined
              | null
            >
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscription_plans_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscription_plans"]
    ];
    subscriptions?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscriptions_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscriptions_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscriptions_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscriptions"]
    ];
    subscriptions_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["subscriptions_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["subscriptions_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscriptions_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscriptions_aggregate"]
    ];
    subscriptions_by_pk?: [
      { id: ValueTypes["uuid"] | Variable<any, string> },
      ValueTypes["subscriptions"]
    ];
    subscriptions_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size:
          | number
          | Variable<
              any,
              string
            > /** cursor to stream the results returned by the query */;
        cursor:
          | Array<
              ValueTypes["subscriptions_stream_cursor_input"] | undefined | null
            >
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["subscriptions_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["subscriptions"]
    ];
    users?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["users_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["users_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["users_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["users"]
    ];
    users_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ValueTypes["users_select_column"]>
          | undefined
          | null
          | Variable<any, string> /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null
          | Variable<
              any,
              string
            > /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null
          | Variable<any, string> /** sort the rows by one or more columns */;
        order_by?:
          | Array<ValueTypes["users_order_by"]>
          | undefined
          | null
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["users_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["users_aggregate"]
    ];
    users_by_pk?: [
      { id: ValueTypes["uuid"] | Variable<any, string> },
      ValueTypes["users"]
    ];
    users_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size:
          | number
          | Variable<
              any,
              string
            > /** cursor to stream the results returned by the query */;
        cursor:
          | Array<ValueTypes["users_stream_cursor_input"] | undefined | null>
          | Variable<any, string> /** filter the rows returned */;
        where?:
          | ValueTypes["users_bool_exp"]
          | undefined
          | null
          | Variable<any, string>;
      },
      ValueTypes["users"]
    ];
    __typename?: boolean | `@${string}`;
  }>;
  /** columns and relationships of "subscriptions" */
  ["subscriptions"]: AliasType<{
    assigned_chef?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    end_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    start_date?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    user_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "subscriptions" */
  ["subscriptions_aggregate"]: AliasType<{
    aggregate?: ValueTypes["subscriptions_aggregate_fields"];
    nodes?: ValueTypes["subscriptions"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "subscriptions" */
  ["subscriptions_aggregate_fields"]: AliasType<{
    avg?: ValueTypes["subscriptions_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ValueTypes["subscriptions_select_column"]>
          | undefined
          | null
          | Variable<any, string>;
        distinct?: boolean | undefined | null | Variable<any, string>;
      },
      boolean | `@${string}`
    ];
    max?: ValueTypes["subscriptions_max_fields"];
    min?: ValueTypes["subscriptions_min_fields"];
    stddev?: ValueTypes["subscriptions_stddev_fields"];
    stddev_pop?: ValueTypes["subscriptions_stddev_pop_fields"];
    stddev_samp?: ValueTypes["subscriptions_stddev_samp_fields"];
    sum?: ValueTypes["subscriptions_sum_fields"];
    var_pop?: ValueTypes["subscriptions_var_pop_fields"];
    var_samp?: ValueTypes["subscriptions_var_samp_fields"];
    variance?: ValueTypes["subscriptions_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate avg on columns */
  ["subscriptions_avg_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "subscriptions". All fields are combined with a logical 'AND'. */
  ["subscriptions_bool_exp"]: {
    _and?:
      | Array<ValueTypes["subscriptions_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    _not?:
      | ValueTypes["subscriptions_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    _or?:
      | Array<ValueTypes["subscriptions_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    assigned_chef?:
      | ValueTypes["uuid_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    created_at?:
      | ValueTypes["timestamptz_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    end_date?:
      | ValueTypes["date_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    id?:
      | ValueTypes["uuid_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    slot_id?:
      | ValueTypes["Int_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    start_date?:
      | ValueTypes["date_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_plan_id?:
      | ValueTypes["Int_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    user_id?:
      | ValueTypes["uuid_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** unique or primary key constraints on table "subscriptions" */
  ["subscriptions_constraint"]: subscriptions_constraint;
  /** input type for incrementing numeric columns in table "subscriptions" */
  ["subscriptions_inc_input"]: {
    slot_id?: number | undefined | null | Variable<any, string>;
    subscription_plan_id?: number | undefined | null | Variable<any, string>;
  };
  /** input type for inserting data into table "subscriptions" */
  ["subscriptions_insert_input"]: {
    assigned_chef?:
      | ValueTypes["uuid"]
      | undefined
      | null
      | Variable<any, string>;
    created_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    end_date?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    slot_id?: number | undefined | null | Variable<any, string>;
    start_date?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    subscription_plan_id?: number | undefined | null | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    user_id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
  };
  /** aggregate max on columns */
  ["subscriptions_max_fields"]: AliasType<{
    assigned_chef?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    end_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    start_date?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    user_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["subscriptions_min_fields"]: AliasType<{
    assigned_chef?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    end_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    start_date?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    user_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "subscriptions" */
  ["subscriptions_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ValueTypes["subscriptions"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "subscriptions" */
  ["subscriptions_on_conflict"]: {
    constraint: ValueTypes["subscriptions_constraint"] | Variable<any, string>;
    update_columns:
      | Array<ValueTypes["subscriptions_update_column"]>
      | Variable<any, string>;
    where?:
      | ValueTypes["subscriptions_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Ordering options when selecting data from "subscriptions". */
  ["subscriptions_order_by"]: {
    assigned_chef?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    created_at?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    end_date?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    slot_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    start_date?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    subscription_plan_id?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    updated_at?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    user_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
  };
  /** primary key columns input for table: subscriptions */
  ["subscriptions_pk_columns_input"]: {
    id: ValueTypes["uuid"] | Variable<any, string>;
  };
  /** select columns of table "subscriptions" */
  ["subscriptions_select_column"]: subscriptions_select_column;
  /** input type for updating data in table "subscriptions" */
  ["subscriptions_set_input"]: {
    assigned_chef?:
      | ValueTypes["uuid"]
      | undefined
      | null
      | Variable<any, string>;
    created_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    end_date?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    slot_id?: number | undefined | null | Variable<any, string>;
    start_date?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    subscription_plan_id?: number | undefined | null | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    user_id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
  };
  /** aggregate stddev on columns */
  ["subscriptions_stddev_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_pop on columns */
  ["subscriptions_stddev_pop_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_samp on columns */
  ["subscriptions_stddev_samp_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Streaming cursor of the table "subscriptions" */
  ["subscriptions_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value:
      | ValueTypes["subscriptions_stream_cursor_value_input"]
      | Variable<any, string>;
    /** cursor ordering */
    ordering?:
      | ValueTypes["cursor_ordering"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscriptions_stream_cursor_value_input"]: {
    assigned_chef?:
      | ValueTypes["uuid"]
      | undefined
      | null
      | Variable<any, string>;
    created_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    end_date?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    slot_id?: number | undefined | null | Variable<any, string>;
    start_date?: ValueTypes["date"] | undefined | null | Variable<any, string>;
    subscription_plan_id?: number | undefined | null | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    user_id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
  };
  /** aggregate sum on columns */
  ["subscriptions_sum_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** update columns of table "subscriptions" */
  ["subscriptions_update_column"]: subscriptions_update_column;
  ["subscriptions_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?:
      | ValueTypes["subscriptions_inc_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ValueTypes["subscriptions_set_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** filter the rows which have to be updated */
    where: ValueTypes["subscriptions_bool_exp"] | Variable<any, string>;
  };
  /** aggregate var_pop on columns */
  ["subscriptions_var_pop_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate var_samp on columns */
  ["subscriptions_var_samp_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate variance on columns */
  ["subscriptions_variance_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  ["time"]: unknown;
  /** Boolean expression to compare columns of type "time". All fields are combined with logical 'AND'. */
  ["time_comparison_exp"]: {
    _eq?: ValueTypes["time"] | undefined | null | Variable<any, string>;
    _gt?: ValueTypes["time"] | undefined | null | Variable<any, string>;
    _gte?: ValueTypes["time"] | undefined | null | Variable<any, string>;
    _in?: Array<ValueTypes["time"]> | undefined | null | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _lt?: ValueTypes["time"] | undefined | null | Variable<any, string>;
    _lte?: ValueTypes["time"] | undefined | null | Variable<any, string>;
    _neq?: ValueTypes["time"] | undefined | null | Variable<any, string>;
    _nin?: Array<ValueTypes["time"]> | undefined | null | Variable<any, string>;
  };
  ["timestamptz"]: unknown;
  /** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
  ["timestamptz_comparison_exp"]: {
    _eq?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>;
    _gt?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>;
    _gte?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>;
    _in?:
      | Array<ValueTypes["timestamptz"]>
      | undefined
      | null
      | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _lt?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>;
    _lte?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>;
    _neq?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>;
    _nin?:
      | Array<ValueTypes["timestamptz"]>
      | undefined
      | null
      | Variable<any, string>;
  };
  ["timetz"]: unknown;
  /** Boolean expression to compare columns of type "timetz". All fields are combined with logical 'AND'. */
  ["timetz_comparison_exp"]: {
    _eq?: ValueTypes["timetz"] | undefined | null | Variable<any, string>;
    _gt?: ValueTypes["timetz"] | undefined | null | Variable<any, string>;
    _gte?: ValueTypes["timetz"] | undefined | null | Variable<any, string>;
    _in?:
      | Array<ValueTypes["timetz"]>
      | undefined
      | null
      | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _lt?: ValueTypes["timetz"] | undefined | null | Variable<any, string>;
    _lte?: ValueTypes["timetz"] | undefined | null | Variable<any, string>;
    _neq?: ValueTypes["timetz"] | undefined | null | Variable<any, string>;
    _nin?:
      | Array<ValueTypes["timetz"]>
      | undefined
      | null
      | Variable<any, string>;
  };
  /** columns and relationships of "users" */
  ["users"]: AliasType<{
    address_city?: boolean | `@${string}`;
    address_line_1?: boolean | `@${string}`;
    address_line_2?: boolean | `@${string}`;
    address_pincode?: boolean | `@${string}`;
    address_state?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    email?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    is_chef?: boolean | `@${string}`;
    phone?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    whatsapp?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "users" */
  ["users_aggregate"]: AliasType<{
    aggregate?: ValueTypes["users_aggregate_fields"];
    nodes?: ValueTypes["users"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "users" */
  ["users_aggregate_fields"]: AliasType<{
    count?: [
      {
        columns?:
          | Array<ValueTypes["users_select_column"]>
          | undefined
          | null
          | Variable<any, string>;
        distinct?: boolean | undefined | null | Variable<any, string>;
      },
      boolean | `@${string}`
    ];
    max?: ValueTypes["users_max_fields"];
    min?: ValueTypes["users_min_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
  ["users_bool_exp"]: {
    _and?:
      | Array<ValueTypes["users_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    _not?:
      | ValueTypes["users_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
    _or?:
      | Array<ValueTypes["users_bool_exp"]>
      | undefined
      | null
      | Variable<any, string>;
    address_city?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    address_line_1?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    address_line_2?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    address_pincode?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    address_state?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    created_at?:
      | ValueTypes["timestamptz_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    email?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    id?:
      | ValueTypes["uuid_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    is_chef?:
      | ValueTypes["Boolean_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    phone?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
    whatsapp?:
      | ValueTypes["String_comparison_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** unique or primary key constraints on table "users" */
  ["users_constraint"]: users_constraint;
  /** input type for inserting data into table "users" */
  ["users_insert_input"]: {
    address_city?: string | undefined | null | Variable<any, string>;
    address_line_1?: string | undefined | null | Variable<any, string>;
    address_line_2?: string | undefined | null | Variable<any, string>;
    address_pincode?: string | undefined | null | Variable<any, string>;
    address_state?: string | undefined | null | Variable<any, string>;
    created_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    email?: string | undefined | null | Variable<any, string>;
    id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    is_chef?: boolean | undefined | null | Variable<any, string>;
    phone?: string | undefined | null | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    whatsapp?: string | undefined | null | Variable<any, string>;
  };
  /** aggregate max on columns */
  ["users_max_fields"]: AliasType<{
    address_city?: boolean | `@${string}`;
    address_line_1?: boolean | `@${string}`;
    address_line_2?: boolean | `@${string}`;
    address_pincode?: boolean | `@${string}`;
    address_state?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    email?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    phone?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    whatsapp?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["users_min_fields"]: AliasType<{
    address_city?: boolean | `@${string}`;
    address_line_1?: boolean | `@${string}`;
    address_line_2?: boolean | `@${string}`;
    address_pincode?: boolean | `@${string}`;
    address_state?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    email?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    phone?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    whatsapp?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "users" */
  ["users_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ValueTypes["users"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "users" */
  ["users_on_conflict"]: {
    constraint: ValueTypes["users_constraint"] | Variable<any, string>;
    update_columns:
      | Array<ValueTypes["users_update_column"]>
      | Variable<any, string>;
    where?:
      | ValueTypes["users_bool_exp"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Ordering options when selecting data from "users". */
  ["users_order_by"]: {
    address_city?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    address_line_1?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    address_line_2?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    address_pincode?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    address_state?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    created_at?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    email?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    is_chef?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    phone?: ValueTypes["order_by"] | undefined | null | Variable<any, string>;
    updated_at?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
    whatsapp?:
      | ValueTypes["order_by"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** primary key columns input for table: users */
  ["users_pk_columns_input"]: {
    id: ValueTypes["uuid"] | Variable<any, string>;
  };
  /** select columns of table "users" */
  ["users_select_column"]: users_select_column;
  /** input type for updating data in table "users" */
  ["users_set_input"]: {
    address_city?: string | undefined | null | Variable<any, string>;
    address_line_1?: string | undefined | null | Variable<any, string>;
    address_line_2?: string | undefined | null | Variable<any, string>;
    address_pincode?: string | undefined | null | Variable<any, string>;
    address_state?: string | undefined | null | Variable<any, string>;
    created_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    email?: string | undefined | null | Variable<any, string>;
    id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    is_chef?: boolean | undefined | null | Variable<any, string>;
    phone?: string | undefined | null | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    whatsapp?: string | undefined | null | Variable<any, string>;
  };
  /** Streaming cursor of the table "users" */
  ["users_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value:
      | ValueTypes["users_stream_cursor_value_input"]
      | Variable<any, string>;
    /** cursor ordering */
    ordering?:
      | ValueTypes["cursor_ordering"]
      | undefined
      | null
      | Variable<any, string>;
  };
  /** Initial value of the column from where the streaming should start */
  ["users_stream_cursor_value_input"]: {
    address_city?: string | undefined | null | Variable<any, string>;
    address_line_1?: string | undefined | null | Variable<any, string>;
    address_line_2?: string | undefined | null | Variable<any, string>;
    address_pincode?: string | undefined | null | Variable<any, string>;
    address_state?: string | undefined | null | Variable<any, string>;
    created_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    email?: string | undefined | null | Variable<any, string>;
    id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    is_chef?: boolean | undefined | null | Variable<any, string>;
    phone?: string | undefined | null | Variable<any, string>;
    updated_at?:
      | ValueTypes["timestamptz"]
      | undefined
      | null
      | Variable<any, string>;
    whatsapp?: string | undefined | null | Variable<any, string>;
  };
  /** update columns of table "users" */
  ["users_update_column"]: users_update_column;
  ["users_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ValueTypes["users_set_input"]
      | undefined
      | null
      | Variable<any, string>;
    /** filter the rows which have to be updated */
    where: ValueTypes["users_bool_exp"] | Variable<any, string>;
  };
  ["uuid"]: unknown;
  /** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
  ["uuid_comparison_exp"]: {
    _eq?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    _gt?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    _gte?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    _in?: Array<ValueTypes["uuid"]> | undefined | null | Variable<any, string>;
    _is_null?: boolean | undefined | null | Variable<any, string>;
    _lt?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    _lte?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    _neq?: ValueTypes["uuid"] | undefined | null | Variable<any, string>;
    _nin?: Array<ValueTypes["uuid"]> | undefined | null | Variable<any, string>;
  };
};

export type ResolverInputTypes = {
  ["schema"]: AliasType<{
    query?: ResolverInputTypes["query_root"];
    mutation?: ResolverInputTypes["mutation_root"];
    subscription?: ResolverInputTypes["subscription_root"];
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
  ["Boolean_comparison_exp"]: {
    _eq?: boolean | undefined | null;
    _gt?: boolean | undefined | null;
    _gte?: boolean | undefined | null;
    _in?: Array<boolean> | undefined | null;
    _is_null?: boolean | undefined | null;
    _lt?: boolean | undefined | null;
    _lte?: boolean | undefined | null;
    _neq?: boolean | undefined | null;
    _nin?: Array<boolean> | undefined | null;
  };
  /** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
  ["Int_comparison_exp"]: {
    _eq?: number | undefined | null;
    _gt?: number | undefined | null;
    _gte?: number | undefined | null;
    _in?: Array<number> | undefined | null;
    _is_null?: boolean | undefined | null;
    _lt?: number | undefined | null;
    _lte?: number | undefined | null;
    _neq?: number | undefined | null;
    _nin?: Array<number> | undefined | null;
  };
  /** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
  ["String_comparison_exp"]: {
    _eq?: string | undefined | null;
    _gt?: string | undefined | null;
    _gte?: string | undefined | null;
    /** does the column match the given case-insensitive pattern */
    _ilike?: string | undefined | null;
    _in?: Array<string> | undefined | null;
    /** does the column match the given POSIX regular expression, case insensitive */
    _iregex?: string | undefined | null;
    _is_null?: boolean | undefined | null;
    /** does the column match the given pattern */
    _like?: string | undefined | null;
    _lt?: string | undefined | null;
    _lte?: string | undefined | null;
    _neq?: string | undefined | null;
    /** does the column NOT match the given case-insensitive pattern */
    _nilike?: string | undefined | null;
    _nin?: Array<string> | undefined | null;
    /** does the column NOT match the given POSIX regular expression, case insensitive */
    _niregex?: string | undefined | null;
    /** does the column NOT match the given pattern */
    _nlike?: string | undefined | null;
    /** does the column NOT match the given POSIX regular expression, case sensitive */
    _nregex?: string | undefined | null;
    /** does the column NOT match the given SQL regular expression */
    _nsimilar?: string | undefined | null;
    /** does the column match the given POSIX regular expression, case sensitive */
    _regex?: string | undefined | null;
    /** does the column match the given SQL regular expression */
    _similar?: string | undefined | null;
  };
  /** ordering argument of a cursor */
  ["cursor_ordering"]: cursor_ordering;
  ["date"]: unknown;
  /** Boolean expression to compare columns of type "date". All fields are combined with logical 'AND'. */
  ["date_comparison_exp"]: {
    _eq?: ResolverInputTypes["date"] | undefined | null;
    _gt?: ResolverInputTypes["date"] | undefined | null;
    _gte?: ResolverInputTypes["date"] | undefined | null;
    _in?: Array<ResolverInputTypes["date"]> | undefined | null;
    _is_null?: boolean | undefined | null;
    _lt?: ResolverInputTypes["date"] | undefined | null;
    _lte?: ResolverInputTypes["date"] | undefined | null;
    _neq?: ResolverInputTypes["date"] | undefined | null;
    _nin?: Array<ResolverInputTypes["date"]> | undefined | null;
  };
  /** columns and relationships of "meals" */
  ["meals"]: AliasType<{
    id?: boolean | `@${string}`;
    name?: boolean | `@${string}`;
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "meals" */
  ["meals_aggregate"]: AliasType<{
    aggregate?: ResolverInputTypes["meals_aggregate_fields"];
    nodes?: ResolverInputTypes["meals"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "meals" */
  ["meals_aggregate_fields"]: AliasType<{
    avg?: ResolverInputTypes["meals_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ResolverInputTypes["meals_select_column"]>
          | undefined
          | null;
        distinct?: boolean | undefined | null;
      },
      boolean | `@${string}`
    ];
    max?: ResolverInputTypes["meals_max_fields"];
    min?: ResolverInputTypes["meals_min_fields"];
    stddev?: ResolverInputTypes["meals_stddev_fields"];
    stddev_pop?: ResolverInputTypes["meals_stddev_pop_fields"];
    stddev_samp?: ResolverInputTypes["meals_stddev_samp_fields"];
    sum?: ResolverInputTypes["meals_sum_fields"];
    var_pop?: ResolverInputTypes["meals_var_pop_fields"];
    var_samp?: ResolverInputTypes["meals_var_samp_fields"];
    variance?: ResolverInputTypes["meals_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate avg on columns */
  ["meals_avg_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "meals". All fields are combined with a logical 'AND'. */
  ["meals_bool_exp"]: {
    _and?: Array<ResolverInputTypes["meals_bool_exp"]> | undefined | null;
    _not?: ResolverInputTypes["meals_bool_exp"] | undefined | null;
    _or?: Array<ResolverInputTypes["meals_bool_exp"]> | undefined | null;
    id?: ResolverInputTypes["Int_comparison_exp"] | undefined | null;
    name?: ResolverInputTypes["String_comparison_exp"] | undefined | null;
    type?: ResolverInputTypes["String_comparison_exp"] | undefined | null;
  };
  /** unique or primary key constraints on table "meals" */
  ["meals_constraint"]: meals_constraint;
  /** input type for incrementing numeric columns in table "meals" */
  ["meals_inc_input"]: {
    id?: number | undefined | null;
  };
  /** input type for inserting data into table "meals" */
  ["meals_insert_input"]: {
    id?: number | undefined | null;
    name?: string | undefined | null;
    type?: string | undefined | null;
  };
  /** aggregate max on columns */
  ["meals_max_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    name?: boolean | `@${string}`;
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["meals_min_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    name?: boolean | `@${string}`;
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "meals" */
  ["meals_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ResolverInputTypes["meals"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "meals" */
  ["meals_on_conflict"]: {
    constraint: ResolverInputTypes["meals_constraint"];
    update_columns: Array<ResolverInputTypes["meals_update_column"]>;
    where?: ResolverInputTypes["meals_bool_exp"] | undefined | null;
  };
  /** Ordering options when selecting data from "meals". */
  ["meals_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
    name?: ResolverInputTypes["order_by"] | undefined | null;
    type?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** primary key columns input for table: meals */
  ["meals_pk_columns_input"]: {
    id: number;
  };
  /** select columns of table "meals" */
  ["meals_select_column"]: meals_select_column;
  /** input type for updating data in table "meals" */
  ["meals_set_input"]: {
    id?: number | undefined | null;
    name?: string | undefined | null;
    type?: string | undefined | null;
  };
  /** aggregate stddev on columns */
  ["meals_stddev_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_pop on columns */
  ["meals_stddev_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_samp on columns */
  ["meals_stddev_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Streaming cursor of the table "meals" */
  ["meals_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ResolverInputTypes["meals_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null;
  };
  /** Initial value of the column from where the streaming should start */
  ["meals_stream_cursor_value_input"]: {
    id?: number | undefined | null;
    name?: string | undefined | null;
    type?: string | undefined | null;
  };
  /** aggregate sum on columns */
  ["meals_sum_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** update columns of table "meals" */
  ["meals_update_column"]: meals_update_column;
  ["meals_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: ResolverInputTypes["meals_inc_input"] | undefined | null;
    /** sets the columns of the filtered rows to the given values */
    _set?: ResolverInputTypes["meals_set_input"] | undefined | null;
    /** filter the rows which have to be updated */
    where: ResolverInputTypes["meals_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["meals_var_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate var_samp on columns */
  ["meals_var_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate variance on columns */
  ["meals_variance_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** mutation root */
  ["mutation_root"]: AliasType<{
    delete_meals?: [
      {
        /** filter the rows which have to be deleted */
        where: ResolverInputTypes["meals_bool_exp"];
      },
      ResolverInputTypes["meals_mutation_response"]
    ];
    delete_meals_by_pk?: [{ id: number }, ResolverInputTypes["meals"]];
    delete_order_delivery_status?: [
      {
        /** filter the rows which have to be deleted */
        where: ResolverInputTypes["order_delivery_status_bool_exp"];
      },
      ResolverInputTypes["order_delivery_status_mutation_response"]
    ];
    delete_order_delivery_status_by_pk?: [
      { value: string },
      ResolverInputTypes["order_delivery_status"]
    ];
    delete_orders?: [
      {
        /** filter the rows which have to be deleted */
        where: ResolverInputTypes["orders_bool_exp"];
      },
      ResolverInputTypes["orders_mutation_response"]
    ];
    delete_orders_by_pk?: [
      { id: ResolverInputTypes["uuid"] },
      ResolverInputTypes["orders"]
    ];
    delete_slots?: [
      {
        /** filter the rows which have to be deleted */
        where: ResolverInputTypes["slots_bool_exp"];
      },
      ResolverInputTypes["slots_mutation_response"]
    ];
    delete_slots_by_pk?: [{ id: number }, ResolverInputTypes["slots"]];
    delete_subscription_plan_frequency?: [
      {
        /** filter the rows which have to be deleted */
        where: ResolverInputTypes["subscription_plan_frequency_bool_exp"];
      },
      ResolverInputTypes["subscription_plan_frequency_mutation_response"]
    ];
    delete_subscription_plan_frequency_by_pk?: [
      { value: string },
      ResolverInputTypes["subscription_plan_frequency"]
    ];
    delete_subscription_plan_type?: [
      {
        /** filter the rows which have to be deleted */
        where: ResolverInputTypes["subscription_plan_type_bool_exp"];
      },
      ResolverInputTypes["subscription_plan_type_mutation_response"]
    ];
    delete_subscription_plan_type_by_pk?: [
      { value: string },
      ResolverInputTypes["subscription_plan_type"]
    ];
    delete_subscription_plans?: [
      {
        /** filter the rows which have to be deleted */
        where: ResolverInputTypes["subscription_plans_bool_exp"];
      },
      ResolverInputTypes["subscription_plans_mutation_response"]
    ];
    delete_subscription_plans_by_pk?: [
      { id: number },
      ResolverInputTypes["subscription_plans"]
    ];
    delete_subscriptions?: [
      {
        /** filter the rows which have to be deleted */
        where: ResolverInputTypes["subscriptions_bool_exp"];
      },
      ResolverInputTypes["subscriptions_mutation_response"]
    ];
    delete_subscriptions_by_pk?: [
      { id: ResolverInputTypes["uuid"] },
      ResolverInputTypes["subscriptions"]
    ];
    delete_users?: [
      {
        /** filter the rows which have to be deleted */
        where: ResolverInputTypes["users_bool_exp"];
      },
      ResolverInputTypes["users_mutation_response"]
    ];
    delete_users_by_pk?: [
      { id: ResolverInputTypes["uuid"] },
      ResolverInputTypes["users"]
    ];
    insert_meals?: [
      {
        /** the rows to be inserted */
        objects: Array<
          ResolverInputTypes["meals_insert_input"]
        > /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["meals_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["meals_mutation_response"]
    ];
    insert_meals_one?: [
      {
        /** the row to be inserted */
        object: ResolverInputTypes["meals_insert_input"] /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["meals_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["meals"]
    ];
    insert_order_delivery_status?: [
      {
        /** the rows to be inserted */
        objects: Array<
          ResolverInputTypes["order_delivery_status_insert_input"]
        > /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["order_delivery_status_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["order_delivery_status_mutation_response"]
    ];
    insert_order_delivery_status_one?: [
      {
        /** the row to be inserted */
        object: ResolverInputTypes["order_delivery_status_insert_input"] /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["order_delivery_status_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["order_delivery_status"]
    ];
    insert_orders?: [
      {
        /** the rows to be inserted */
        objects: Array<
          ResolverInputTypes["orders_insert_input"]
        > /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["orders_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["orders_mutation_response"]
    ];
    insert_orders_one?: [
      {
        /** the row to be inserted */
        object: ResolverInputTypes["orders_insert_input"] /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["orders_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["orders"]
    ];
    insert_slots?: [
      {
        /** the rows to be inserted */
        objects: Array<
          ResolverInputTypes["slots_insert_input"]
        > /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["slots_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["slots_mutation_response"]
    ];
    insert_slots_one?: [
      {
        /** the row to be inserted */
        object: ResolverInputTypes["slots_insert_input"] /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["slots_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["slots"]
    ];
    insert_subscription_plan_frequency?: [
      {
        /** the rows to be inserted */
        objects: Array<
          ResolverInputTypes["subscription_plan_frequency_insert_input"]
        > /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["subscription_plan_frequency_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_frequency_mutation_response"]
    ];
    insert_subscription_plan_frequency_one?: [
      {
        /** the row to be inserted */
        object: ResolverInputTypes["subscription_plan_frequency_insert_input"] /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["subscription_plan_frequency_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_frequency"]
    ];
    insert_subscription_plan_type?: [
      {
        /** the rows to be inserted */
        objects: Array<
          ResolverInputTypes["subscription_plan_type_insert_input"]
        > /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["subscription_plan_type_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_type_mutation_response"]
    ];
    insert_subscription_plan_type_one?: [
      {
        /** the row to be inserted */
        object: ResolverInputTypes["subscription_plan_type_insert_input"] /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["subscription_plan_type_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_type"]
    ];
    insert_subscription_plans?: [
      {
        /** the rows to be inserted */
        objects: Array<
          ResolverInputTypes["subscription_plans_insert_input"]
        > /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["subscription_plans_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans_mutation_response"]
    ];
    insert_subscription_plans_one?: [
      {
        /** the row to be inserted */
        object: ResolverInputTypes["subscription_plans_insert_input"] /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["subscription_plans_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans"]
    ];
    insert_subscriptions?: [
      {
        /** the rows to be inserted */
        objects: Array<
          ResolverInputTypes["subscriptions_insert_input"]
        > /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["subscriptions_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscriptions_mutation_response"]
    ];
    insert_subscriptions_one?: [
      {
        /** the row to be inserted */
        object: ResolverInputTypes["subscriptions_insert_input"] /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["subscriptions_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscriptions"]
    ];
    insert_users?: [
      {
        /** the rows to be inserted */
        objects: Array<
          ResolverInputTypes["users_insert_input"]
        > /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["users_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["users_mutation_response"]
    ];
    insert_users_one?: [
      {
        /** the row to be inserted */
        object: ResolverInputTypes["users_insert_input"] /** upsert condition */;
        on_conflict?:
          | ResolverInputTypes["users_on_conflict"]
          | undefined
          | null;
      },
      ResolverInputTypes["users"]
    ];
    update_meals?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["meals_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ResolverInputTypes["meals_set_input"]
          | undefined
          | null /** filter the rows which have to be updated */;
        where: ResolverInputTypes["meals_bool_exp"];
      },
      ResolverInputTypes["meals_mutation_response"]
    ];
    update_meals_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["meals_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?: ResolverInputTypes["meals_set_input"] | undefined | null;
        pk_columns: ResolverInputTypes["meals_pk_columns_input"];
      },
      ResolverInputTypes["meals"]
    ];
    update_meals_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ResolverInputTypes["meals_updates"]>;
      },
      ResolverInputTypes["meals_mutation_response"]
    ];
    update_order_delivery_status?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ResolverInputTypes["order_delivery_status_set_input"]
          | undefined
          | null /** filter the rows which have to be updated */;
        where: ResolverInputTypes["order_delivery_status_bool_exp"];
      },
      ResolverInputTypes["order_delivery_status_mutation_response"]
    ];
    update_order_delivery_status_by_pk?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ResolverInputTypes["order_delivery_status_set_input"]
          | undefined
          | null;
        pk_columns: ResolverInputTypes["order_delivery_status_pk_columns_input"];
      },
      ResolverInputTypes["order_delivery_status"]
    ];
    update_order_delivery_status_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ResolverInputTypes["order_delivery_status_updates"]>;
      },
      ResolverInputTypes["order_delivery_status_mutation_response"]
    ];
    update_orders?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["orders_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ResolverInputTypes["orders_set_input"]
          | undefined
          | null /** filter the rows which have to be updated */;
        where: ResolverInputTypes["orders_bool_exp"];
      },
      ResolverInputTypes["orders_mutation_response"]
    ];
    update_orders_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["orders_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?: ResolverInputTypes["orders_set_input"] | undefined | null;
        pk_columns: ResolverInputTypes["orders_pk_columns_input"];
      },
      ResolverInputTypes["orders"]
    ];
    update_orders_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ResolverInputTypes["orders_updates"]>;
      },
      ResolverInputTypes["orders_mutation_response"]
    ];
    update_slots?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["slots_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ResolverInputTypes["slots_set_input"]
          | undefined
          | null /** filter the rows which have to be updated */;
        where: ResolverInputTypes["slots_bool_exp"];
      },
      ResolverInputTypes["slots_mutation_response"]
    ];
    update_slots_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["slots_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?: ResolverInputTypes["slots_set_input"] | undefined | null;
        pk_columns: ResolverInputTypes["slots_pk_columns_input"];
      },
      ResolverInputTypes["slots"]
    ];
    update_slots_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ResolverInputTypes["slots_updates"]>;
      },
      ResolverInputTypes["slots_mutation_response"]
    ];
    update_subscription_plan_frequency?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ResolverInputTypes["subscription_plan_frequency_set_input"]
          | undefined
          | null /** filter the rows which have to be updated */;
        where: ResolverInputTypes["subscription_plan_frequency_bool_exp"];
      },
      ResolverInputTypes["subscription_plan_frequency_mutation_response"]
    ];
    update_subscription_plan_frequency_by_pk?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ResolverInputTypes["subscription_plan_frequency_set_input"]
          | undefined
          | null;
        pk_columns: ResolverInputTypes["subscription_plan_frequency_pk_columns_input"];
      },
      ResolverInputTypes["subscription_plan_frequency"]
    ];
    update_subscription_plan_frequency_many?: [
      {
        /** updates to execute, in order */
        updates: Array<
          ResolverInputTypes["subscription_plan_frequency_updates"]
        >;
      },
      ResolverInputTypes["subscription_plan_frequency_mutation_response"]
    ];
    update_subscription_plan_type?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ResolverInputTypes["subscription_plan_type_set_input"]
          | undefined
          | null /** filter the rows which have to be updated */;
        where: ResolverInputTypes["subscription_plan_type_bool_exp"];
      },
      ResolverInputTypes["subscription_plan_type_mutation_response"]
    ];
    update_subscription_plan_type_by_pk?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ResolverInputTypes["subscription_plan_type_set_input"]
          | undefined
          | null;
        pk_columns: ResolverInputTypes["subscription_plan_type_pk_columns_input"];
      },
      ResolverInputTypes["subscription_plan_type"]
    ];
    update_subscription_plan_type_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ResolverInputTypes["subscription_plan_type_updates"]>;
      },
      ResolverInputTypes["subscription_plan_type_mutation_response"]
    ];
    update_subscription_plans?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["subscription_plans_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ResolverInputTypes["subscription_plans_set_input"]
          | undefined
          | null /** filter the rows which have to be updated */;
        where: ResolverInputTypes["subscription_plans_bool_exp"];
      },
      ResolverInputTypes["subscription_plans_mutation_response"]
    ];
    update_subscription_plans_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["subscription_plans_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ResolverInputTypes["subscription_plans_set_input"]
          | undefined
          | null;
        pk_columns: ResolverInputTypes["subscription_plans_pk_columns_input"];
      },
      ResolverInputTypes["subscription_plans"]
    ];
    update_subscription_plans_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ResolverInputTypes["subscription_plans_updates"]>;
      },
      ResolverInputTypes["subscription_plans_mutation_response"]
    ];
    update_subscriptions?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["subscriptions_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?:
          | ResolverInputTypes["subscriptions_set_input"]
          | undefined
          | null /** filter the rows which have to be updated */;
        where: ResolverInputTypes["subscriptions_bool_exp"];
      },
      ResolverInputTypes["subscriptions_mutation_response"]
    ];
    update_subscriptions_by_pk?: [
      {
        /** increments the numeric columns with given value of the filtered values */
        _inc?:
          | ResolverInputTypes["subscriptions_inc_input"]
          | undefined
          | null /** sets the columns of the filtered rows to the given values */;
        _set?: ResolverInputTypes["subscriptions_set_input"] | undefined | null;
        pk_columns: ResolverInputTypes["subscriptions_pk_columns_input"];
      },
      ResolverInputTypes["subscriptions"]
    ];
    update_subscriptions_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ResolverInputTypes["subscriptions_updates"]>;
      },
      ResolverInputTypes["subscriptions_mutation_response"]
    ];
    update_users?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?:
          | ResolverInputTypes["users_set_input"]
          | undefined
          | null /** filter the rows which have to be updated */;
        where: ResolverInputTypes["users_bool_exp"];
      },
      ResolverInputTypes["users_mutation_response"]
    ];
    update_users_by_pk?: [
      {
        /** sets the columns of the filtered rows to the given values */
        _set?: ResolverInputTypes["users_set_input"] | undefined | null;
        pk_columns: ResolverInputTypes["users_pk_columns_input"];
      },
      ResolverInputTypes["users"]
    ];
    update_users_many?: [
      {
        /** updates to execute, in order */
        updates: Array<ResolverInputTypes["users_updates"]>;
      },
      ResolverInputTypes["users_mutation_response"]
    ];
    __typename?: boolean | `@${string}`;
  }>;
  /** column ordering options */
  ["order_by"]: order_by;
  /** columns and relationships of "order_delivery_status" */
  ["order_delivery_status"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "order_delivery_status" */
  ["order_delivery_status_aggregate"]: AliasType<{
    aggregate?: ResolverInputTypes["order_delivery_status_aggregate_fields"];
    nodes?: ResolverInputTypes["order_delivery_status"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "order_delivery_status" */
  ["order_delivery_status_aggregate_fields"]: AliasType<{
    count?: [
      {
        columns?:
          | Array<ResolverInputTypes["order_delivery_status_select_column"]>
          | undefined
          | null;
        distinct?: boolean | undefined | null;
      },
      boolean | `@${string}`
    ];
    max?: ResolverInputTypes["order_delivery_status_max_fields"];
    min?: ResolverInputTypes["order_delivery_status_min_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "order_delivery_status". All fields are combined with a logical 'AND'. */
  ["order_delivery_status_bool_exp"]: {
    _and?:
      | Array<ResolverInputTypes["order_delivery_status_bool_exp"]>
      | undefined
      | null;
    _not?:
      | ResolverInputTypes["order_delivery_status_bool_exp"]
      | undefined
      | null;
    _or?:
      | Array<ResolverInputTypes["order_delivery_status_bool_exp"]>
      | undefined
      | null;
    value?: ResolverInputTypes["String_comparison_exp"] | undefined | null;
  };
  /** unique or primary key constraints on table "order_delivery_status" */
  ["order_delivery_status_constraint"]: order_delivery_status_constraint;
  ["order_delivery_status_enum"]: order_delivery_status_enum;
  /** Boolean expression to compare columns of type "order_delivery_status_enum". All fields are combined with logical 'AND'. */
  ["order_delivery_status_enum_comparison_exp"]: {
    _eq?: ResolverInputTypes["order_delivery_status_enum"] | undefined | null;
    _in?:
      | Array<ResolverInputTypes["order_delivery_status_enum"]>
      | undefined
      | null;
    _is_null?: boolean | undefined | null;
    _neq?: ResolverInputTypes["order_delivery_status_enum"] | undefined | null;
    _nin?:
      | Array<ResolverInputTypes["order_delivery_status_enum"]>
      | undefined
      | null;
  };
  /** input type for inserting data into table "order_delivery_status" */
  ["order_delivery_status_insert_input"]: {
    value?: string | undefined | null;
  };
  /** aggregate max on columns */
  ["order_delivery_status_max_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["order_delivery_status_min_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "order_delivery_status" */
  ["order_delivery_status_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ResolverInputTypes["order_delivery_status"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "order_delivery_status" */
  ["order_delivery_status_on_conflict"]: {
    constraint: ResolverInputTypes["order_delivery_status_constraint"];
    update_columns: Array<
      ResolverInputTypes["order_delivery_status_update_column"]
    >;
    where?:
      | ResolverInputTypes["order_delivery_status_bool_exp"]
      | undefined
      | null;
  };
  /** Ordering options when selecting data from "order_delivery_status". */
  ["order_delivery_status_order_by"]: {
    value?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** primary key columns input for table: order_delivery_status */
  ["order_delivery_status_pk_columns_input"]: {
    value: string;
  };
  /** select columns of table "order_delivery_status" */
  ["order_delivery_status_select_column"]: order_delivery_status_select_column;
  /** input type for updating data in table "order_delivery_status" */
  ["order_delivery_status_set_input"]: {
    value?: string | undefined | null;
  };
  /** Streaming cursor of the table "order_delivery_status" */
  ["order_delivery_status_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ResolverInputTypes["order_delivery_status_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null;
  };
  /** Initial value of the column from where the streaming should start */
  ["order_delivery_status_stream_cursor_value_input"]: {
    value?: string | undefined | null;
  };
  /** update columns of table "order_delivery_status" */
  ["order_delivery_status_update_column"]: order_delivery_status_update_column;
  ["order_delivery_status_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ResolverInputTypes["order_delivery_status_set_input"]
      | undefined
      | null;
    /** filter the rows which have to be updated */
    where: ResolverInputTypes["order_delivery_status_bool_exp"];
  };
  /** columns and relationships of "orders" */
  ["orders"]: AliasType<{
    created_at?: boolean | `@${string}`;
    deliveredAt?: boolean | `@${string}`;
    delivery_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    status?: boolean | `@${string}`;
    subscription_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "orders" */
  ["orders_aggregate"]: AliasType<{
    aggregate?: ResolverInputTypes["orders_aggregate_fields"];
    nodes?: ResolverInputTypes["orders"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "orders" */
  ["orders_aggregate_fields"]: AliasType<{
    avg?: ResolverInputTypes["orders_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ResolverInputTypes["orders_select_column"]>
          | undefined
          | null;
        distinct?: boolean | undefined | null;
      },
      boolean | `@${string}`
    ];
    max?: ResolverInputTypes["orders_max_fields"];
    min?: ResolverInputTypes["orders_min_fields"];
    stddev?: ResolverInputTypes["orders_stddev_fields"];
    stddev_pop?: ResolverInputTypes["orders_stddev_pop_fields"];
    stddev_samp?: ResolverInputTypes["orders_stddev_samp_fields"];
    sum?: ResolverInputTypes["orders_sum_fields"];
    var_pop?: ResolverInputTypes["orders_var_pop_fields"];
    var_samp?: ResolverInputTypes["orders_var_samp_fields"];
    variance?: ResolverInputTypes["orders_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate avg on columns */
  ["orders_avg_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "orders". All fields are combined with a logical 'AND'. */
  ["orders_bool_exp"]: {
    _and?: Array<ResolverInputTypes["orders_bool_exp"]> | undefined | null;
    _not?: ResolverInputTypes["orders_bool_exp"] | undefined | null;
    _or?: Array<ResolverInputTypes["orders_bool_exp"]> | undefined | null;
    created_at?:
      | ResolverInputTypes["timestamptz_comparison_exp"]
      | undefined
      | null;
    deliveredAt?:
      | ResolverInputTypes["timestamptz_comparison_exp"]
      | undefined
      | null;
    delivery_date?:
      | ResolverInputTypes["date_comparison_exp"]
      | undefined
      | null;
    id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null;
    meal_id?: ResolverInputTypes["Int_comparison_exp"] | undefined | null;
    slot_id?: ResolverInputTypes["Int_comparison_exp"] | undefined | null;
    status?:
      | ResolverInputTypes["order_delivery_status_enum_comparison_exp"]
      | undefined
      | null;
    subscription_id?:
      | ResolverInputTypes["uuid_comparison_exp"]
      | undefined
      | null;
    updated_at?:
      | ResolverInputTypes["timestamptz_comparison_exp"]
      | undefined
      | null;
  };
  /** unique or primary key constraints on table "orders" */
  ["orders_constraint"]: orders_constraint;
  /** input type for incrementing numeric columns in table "orders" */
  ["orders_inc_input"]: {
    meal_id?: number | undefined | null;
    slot_id?: number | undefined | null;
  };
  /** input type for inserting data into table "orders" */
  ["orders_insert_input"]: {
    created_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    deliveredAt?: ResolverInputTypes["timestamptz"] | undefined | null;
    delivery_date?: ResolverInputTypes["date"] | undefined | null;
    id?: ResolverInputTypes["uuid"] | undefined | null;
    meal_id?: number | undefined | null;
    slot_id?: number | undefined | null;
    status?:
      | ResolverInputTypes["order_delivery_status_enum"]
      | undefined
      | null;
    subscription_id?: ResolverInputTypes["uuid"] | undefined | null;
    updated_at?: ResolverInputTypes["timestamptz"] | undefined | null;
  };
  /** aggregate max on columns */
  ["orders_max_fields"]: AliasType<{
    created_at?: boolean | `@${string}`;
    deliveredAt?: boolean | `@${string}`;
    delivery_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    subscription_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["orders_min_fields"]: AliasType<{
    created_at?: boolean | `@${string}`;
    deliveredAt?: boolean | `@${string}`;
    delivery_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    subscription_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "orders" */
  ["orders_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ResolverInputTypes["orders"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "orders" */
  ["orders_on_conflict"]: {
    constraint: ResolverInputTypes["orders_constraint"];
    update_columns: Array<ResolverInputTypes["orders_update_column"]>;
    where?: ResolverInputTypes["orders_bool_exp"] | undefined | null;
  };
  /** Ordering options when selecting data from "orders". */
  ["orders_order_by"]: {
    created_at?: ResolverInputTypes["order_by"] | undefined | null;
    deliveredAt?: ResolverInputTypes["order_by"] | undefined | null;
    delivery_date?: ResolverInputTypes["order_by"] | undefined | null;
    id?: ResolverInputTypes["order_by"] | undefined | null;
    meal_id?: ResolverInputTypes["order_by"] | undefined | null;
    slot_id?: ResolverInputTypes["order_by"] | undefined | null;
    status?: ResolverInputTypes["order_by"] | undefined | null;
    subscription_id?: ResolverInputTypes["order_by"] | undefined | null;
    updated_at?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** primary key columns input for table: orders */
  ["orders_pk_columns_input"]: {
    id: ResolverInputTypes["uuid"];
  };
  /** select columns of table "orders" */
  ["orders_select_column"]: orders_select_column;
  /** input type for updating data in table "orders" */
  ["orders_set_input"]: {
    created_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    deliveredAt?: ResolverInputTypes["timestamptz"] | undefined | null;
    delivery_date?: ResolverInputTypes["date"] | undefined | null;
    id?: ResolverInputTypes["uuid"] | undefined | null;
    meal_id?: number | undefined | null;
    slot_id?: number | undefined | null;
    status?:
      | ResolverInputTypes["order_delivery_status_enum"]
      | undefined
      | null;
    subscription_id?: ResolverInputTypes["uuid"] | undefined | null;
    updated_at?: ResolverInputTypes["timestamptz"] | undefined | null;
  };
  /** aggregate stddev on columns */
  ["orders_stddev_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_pop on columns */
  ["orders_stddev_pop_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_samp on columns */
  ["orders_stddev_samp_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Streaming cursor of the table "orders" */
  ["orders_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ResolverInputTypes["orders_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null;
  };
  /** Initial value of the column from where the streaming should start */
  ["orders_stream_cursor_value_input"]: {
    created_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    deliveredAt?: ResolverInputTypes["timestamptz"] | undefined | null;
    delivery_date?: ResolverInputTypes["date"] | undefined | null;
    id?: ResolverInputTypes["uuid"] | undefined | null;
    meal_id?: number | undefined | null;
    slot_id?: number | undefined | null;
    status?:
      | ResolverInputTypes["order_delivery_status_enum"]
      | undefined
      | null;
    subscription_id?: ResolverInputTypes["uuid"] | undefined | null;
    updated_at?: ResolverInputTypes["timestamptz"] | undefined | null;
  };
  /** aggregate sum on columns */
  ["orders_sum_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** update columns of table "orders" */
  ["orders_update_column"]: orders_update_column;
  ["orders_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: ResolverInputTypes["orders_inc_input"] | undefined | null;
    /** sets the columns of the filtered rows to the given values */
    _set?: ResolverInputTypes["orders_set_input"] | undefined | null;
    /** filter the rows which have to be updated */
    where: ResolverInputTypes["orders_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["orders_var_pop_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate var_samp on columns */
  ["orders_var_samp_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate variance on columns */
  ["orders_variance_fields"]: AliasType<{
    meal_id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  ["query_root"]: AliasType<{
    meals?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["meals_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["meals_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["meals_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["meals"]
    ];
    meals_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["meals_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["meals_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["meals_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["meals_aggregate"]
    ];
    meals_by_pk?: [{ id: number }, ResolverInputTypes["meals"]];
    order_delivery_status?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["order_delivery_status_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["order_delivery_status_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["order_delivery_status_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["order_delivery_status"]
    ];
    order_delivery_status_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["order_delivery_status_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["order_delivery_status_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["order_delivery_status_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["order_delivery_status_aggregate"]
    ];
    order_delivery_status_by_pk?: [
      { value: string },
      ResolverInputTypes["order_delivery_status"]
    ];
    orders?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["orders_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["orders_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["orders_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["orders"]
    ];
    orders_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["orders_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["orders_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["orders_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["orders_aggregate"]
    ];
    orders_by_pk?: [
      { id: ResolverInputTypes["uuid"] },
      ResolverInputTypes["orders"]
    ];
    slots?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["slots_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["slots_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["slots_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["slots"]
    ];
    slots_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["slots_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["slots_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["slots_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["slots_aggregate"]
    ];
    slots_by_pk?: [{ id: number }, ResolverInputTypes["slots"]];
    subscription_plan_frequency?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<
              ResolverInputTypes["subscription_plan_frequency_select_column"]
            >
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plan_frequency_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_frequency"]
    ];
    subscription_plan_frequency_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<
              ResolverInputTypes["subscription_plan_frequency_select_column"]
            >
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plan_frequency_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_frequency_aggregate"]
    ];
    subscription_plan_frequency_by_pk?: [
      { value: string },
      ResolverInputTypes["subscription_plan_frequency"]
    ];
    subscription_plan_type?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plan_type_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plan_type_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_type"]
    ];
    subscription_plan_type_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plan_type_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plan_type_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_type_aggregate"]
    ];
    subscription_plan_type_by_pk?: [
      { value: string },
      ResolverInputTypes["subscription_plan_type"]
    ];
    subscription_plans?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plans_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plans_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plans_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans"]
    ];
    subscription_plans_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plans_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plans_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plans_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans_aggregate"]
    ];
    subscription_plans_by_pk?: [
      { id: number },
      ResolverInputTypes["subscription_plans"]
    ];
    subscriptions?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscriptions_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscriptions_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["subscriptions_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["subscriptions"]
    ];
    subscriptions_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscriptions_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscriptions_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["subscriptions_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["subscriptions_aggregate"]
    ];
    subscriptions_by_pk?: [
      { id: ResolverInputTypes["uuid"] },
      ResolverInputTypes["subscriptions"]
    ];
    users?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["users_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["users_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["users_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["users"]
    ];
    users_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["users_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["users_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["users_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["users_aggregate"]
    ];
    users_by_pk?: [
      { id: ResolverInputTypes["uuid"] },
      ResolverInputTypes["users"]
    ];
    __typename?: boolean | `@${string}`;
  }>;
  /** columns and relationships of "slots" */
  ["slots"]: AliasType<{
    from?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    to?: boolean | `@${string}`;
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "slots" */
  ["slots_aggregate"]: AliasType<{
    aggregate?: ResolverInputTypes["slots_aggregate_fields"];
    nodes?: ResolverInputTypes["slots"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "slots" */
  ["slots_aggregate_fields"]: AliasType<{
    avg?: ResolverInputTypes["slots_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ResolverInputTypes["slots_select_column"]>
          | undefined
          | null;
        distinct?: boolean | undefined | null;
      },
      boolean | `@${string}`
    ];
    max?: ResolverInputTypes["slots_max_fields"];
    min?: ResolverInputTypes["slots_min_fields"];
    stddev?: ResolverInputTypes["slots_stddev_fields"];
    stddev_pop?: ResolverInputTypes["slots_stddev_pop_fields"];
    stddev_samp?: ResolverInputTypes["slots_stddev_samp_fields"];
    sum?: ResolverInputTypes["slots_sum_fields"];
    var_pop?: ResolverInputTypes["slots_var_pop_fields"];
    var_samp?: ResolverInputTypes["slots_var_samp_fields"];
    variance?: ResolverInputTypes["slots_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate avg on columns */
  ["slots_avg_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "slots". All fields are combined with a logical 'AND'. */
  ["slots_bool_exp"]: {
    _and?: Array<ResolverInputTypes["slots_bool_exp"]> | undefined | null;
    _not?: ResolverInputTypes["slots_bool_exp"] | undefined | null;
    _or?: Array<ResolverInputTypes["slots_bool_exp"]> | undefined | null;
    from?: ResolverInputTypes["time_comparison_exp"] | undefined | null;
    id?: ResolverInputTypes["Int_comparison_exp"] | undefined | null;
    to?: ResolverInputTypes["timetz_comparison_exp"] | undefined | null;
    type?:
      | ResolverInputTypes["subscription_plan_frequency_enum_comparison_exp"]
      | undefined
      | null;
  };
  /** unique or primary key constraints on table "slots" */
  ["slots_constraint"]: slots_constraint;
  /** input type for incrementing numeric columns in table "slots" */
  ["slots_inc_input"]: {
    id?: number | undefined | null;
  };
  /** input type for inserting data into table "slots" */
  ["slots_insert_input"]: {
    from?: ResolverInputTypes["time"] | undefined | null;
    id?: number | undefined | null;
    to?: ResolverInputTypes["timetz"] | undefined | null;
    type?:
      | ResolverInputTypes["subscription_plan_frequency_enum"]
      | undefined
      | null;
  };
  /** aggregate max on columns */
  ["slots_max_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    to?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["slots_min_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    to?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "slots" */
  ["slots_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ResolverInputTypes["slots"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "slots" */
  ["slots_on_conflict"]: {
    constraint: ResolverInputTypes["slots_constraint"];
    update_columns: Array<ResolverInputTypes["slots_update_column"]>;
    where?: ResolverInputTypes["slots_bool_exp"] | undefined | null;
  };
  /** Ordering options when selecting data from "slots". */
  ["slots_order_by"]: {
    from?: ResolverInputTypes["order_by"] | undefined | null;
    id?: ResolverInputTypes["order_by"] | undefined | null;
    to?: ResolverInputTypes["order_by"] | undefined | null;
    type?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** primary key columns input for table: slots */
  ["slots_pk_columns_input"]: {
    id: number;
  };
  /** select columns of table "slots" */
  ["slots_select_column"]: slots_select_column;
  /** input type for updating data in table "slots" */
  ["slots_set_input"]: {
    from?: ResolverInputTypes["time"] | undefined | null;
    id?: number | undefined | null;
    to?: ResolverInputTypes["timetz"] | undefined | null;
    type?:
      | ResolverInputTypes["subscription_plan_frequency_enum"]
      | undefined
      | null;
  };
  /** aggregate stddev on columns */
  ["slots_stddev_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_pop on columns */
  ["slots_stddev_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_samp on columns */
  ["slots_stddev_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Streaming cursor of the table "slots" */
  ["slots_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ResolverInputTypes["slots_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null;
  };
  /** Initial value of the column from where the streaming should start */
  ["slots_stream_cursor_value_input"]: {
    from?: ResolverInputTypes["time"] | undefined | null;
    id?: number | undefined | null;
    to?: ResolverInputTypes["timetz"] | undefined | null;
    type?:
      | ResolverInputTypes["subscription_plan_frequency_enum"]
      | undefined
      | null;
  };
  /** aggregate sum on columns */
  ["slots_sum_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** update columns of table "slots" */
  ["slots_update_column"]: slots_update_column;
  ["slots_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: ResolverInputTypes["slots_inc_input"] | undefined | null;
    /** sets the columns of the filtered rows to the given values */
    _set?: ResolverInputTypes["slots_set_input"] | undefined | null;
    /** filter the rows which have to be updated */
    where: ResolverInputTypes["slots_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["slots_var_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate var_samp on columns */
  ["slots_var_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate variance on columns */
  ["slots_variance_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** columns and relationships of "subscription_plan_frequency" */
  ["subscription_plan_frequency"]: AliasType<{
    subscription_plans?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plans_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plans_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plans_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans"]
    ];
    subscription_plans_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plans_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plans_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plans_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans_aggregate"]
    ];
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "subscription_plan_frequency" */
  ["subscription_plan_frequency_aggregate"]: AliasType<{
    aggregate?: ResolverInputTypes["subscription_plan_frequency_aggregate_fields"];
    nodes?: ResolverInputTypes["subscription_plan_frequency"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "subscription_plan_frequency" */
  ["subscription_plan_frequency_aggregate_fields"]: AliasType<{
    count?: [
      {
        columns?:
          | Array<
              ResolverInputTypes["subscription_plan_frequency_select_column"]
            >
          | undefined
          | null;
        distinct?: boolean | undefined | null;
      },
      boolean | `@${string}`
    ];
    max?: ResolverInputTypes["subscription_plan_frequency_max_fields"];
    min?: ResolverInputTypes["subscription_plan_frequency_min_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "subscription_plan_frequency". All fields are combined with a logical 'AND'. */
  ["subscription_plan_frequency_bool_exp"]: {
    _and?:
      | Array<ResolverInputTypes["subscription_plan_frequency_bool_exp"]>
      | undefined
      | null;
    _not?:
      | ResolverInputTypes["subscription_plan_frequency_bool_exp"]
      | undefined
      | null;
    _or?:
      | Array<ResolverInputTypes["subscription_plan_frequency_bool_exp"]>
      | undefined
      | null;
    subscription_plans?:
      | ResolverInputTypes["subscription_plans_bool_exp"]
      | undefined
      | null;
    subscription_plans_aggregate?:
      | ResolverInputTypes["subscription_plans_aggregate_bool_exp"]
      | undefined
      | null;
    value?: ResolverInputTypes["String_comparison_exp"] | undefined | null;
  };
  /** unique or primary key constraints on table "subscription_plan_frequency" */
  ["subscription_plan_frequency_constraint"]: subscription_plan_frequency_constraint;
  ["subscription_plan_frequency_enum"]: subscription_plan_frequency_enum;
  /** Boolean expression to compare columns of type "subscription_plan_frequency_enum". All fields are combined with logical 'AND'. */
  ["subscription_plan_frequency_enum_comparison_exp"]: {
    _eq?:
      | ResolverInputTypes["subscription_plan_frequency_enum"]
      | undefined
      | null;
    _in?:
      | Array<ResolverInputTypes["subscription_plan_frequency_enum"]>
      | undefined
      | null;
    _is_null?: boolean | undefined | null;
    _neq?:
      | ResolverInputTypes["subscription_plan_frequency_enum"]
      | undefined
      | null;
    _nin?:
      | Array<ResolverInputTypes["subscription_plan_frequency_enum"]>
      | undefined
      | null;
  };
  /** input type for inserting data into table "subscription_plan_frequency" */
  ["subscription_plan_frequency_insert_input"]: {
    subscription_plans?:
      | ResolverInputTypes["subscription_plans_arr_rel_insert_input"]
      | undefined
      | null;
    value?: string | undefined | null;
  };
  /** aggregate max on columns */
  ["subscription_plan_frequency_max_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["subscription_plan_frequency_min_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "subscription_plan_frequency" */
  ["subscription_plan_frequency_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ResolverInputTypes["subscription_plan_frequency"];
    __typename?: boolean | `@${string}`;
  }>;
  /** input type for inserting object relation for remote table "subscription_plan_frequency" */
  ["subscription_plan_frequency_obj_rel_insert_input"]: {
    data: ResolverInputTypes["subscription_plan_frequency_insert_input"];
    /** upsert condition */
    on_conflict?:
      | ResolverInputTypes["subscription_plan_frequency_on_conflict"]
      | undefined
      | null;
  };
  /** on_conflict condition type for table "subscription_plan_frequency" */
  ["subscription_plan_frequency_on_conflict"]: {
    constraint: ResolverInputTypes["subscription_plan_frequency_constraint"];
    update_columns: Array<
      ResolverInputTypes["subscription_plan_frequency_update_column"]
    >;
    where?:
      | ResolverInputTypes["subscription_plan_frequency_bool_exp"]
      | undefined
      | null;
  };
  /** Ordering options when selecting data from "subscription_plan_frequency". */
  ["subscription_plan_frequency_order_by"]: {
    subscription_plans_aggregate?:
      | ResolverInputTypes["subscription_plans_aggregate_order_by"]
      | undefined
      | null;
    value?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** primary key columns input for table: subscription_plan_frequency */
  ["subscription_plan_frequency_pk_columns_input"]: {
    value: string;
  };
  /** select columns of table "subscription_plan_frequency" */
  ["subscription_plan_frequency_select_column"]: subscription_plan_frequency_select_column;
  /** input type for updating data in table "subscription_plan_frequency" */
  ["subscription_plan_frequency_set_input"]: {
    value?: string | undefined | null;
  };
  /** Streaming cursor of the table "subscription_plan_frequency" */
  ["subscription_plan_frequency_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ResolverInputTypes["subscription_plan_frequency_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plan_frequency_stream_cursor_value_input"]: {
    value?: string | undefined | null;
  };
  /** update columns of table "subscription_plan_frequency" */
  ["subscription_plan_frequency_update_column"]: subscription_plan_frequency_update_column;
  ["subscription_plan_frequency_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ResolverInputTypes["subscription_plan_frequency_set_input"]
      | undefined
      | null;
    /** filter the rows which have to be updated */
    where: ResolverInputTypes["subscription_plan_frequency_bool_exp"];
  };
  /** columns and relationships of "subscription_plan_type" */
  ["subscription_plan_type"]: AliasType<{
    subscription_plans?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plans_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plans_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plans_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans"]
    ];
    subscription_plans_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plans_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plans_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plans_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans_aggregate"]
    ];
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "subscription_plan_type" */
  ["subscription_plan_type_aggregate"]: AliasType<{
    aggregate?: ResolverInputTypes["subscription_plan_type_aggregate_fields"];
    nodes?: ResolverInputTypes["subscription_plan_type"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "subscription_plan_type" */
  ["subscription_plan_type_aggregate_fields"]: AliasType<{
    count?: [
      {
        columns?:
          | Array<ResolverInputTypes["subscription_plan_type_select_column"]>
          | undefined
          | null;
        distinct?: boolean | undefined | null;
      },
      boolean | `@${string}`
    ];
    max?: ResolverInputTypes["subscription_plan_type_max_fields"];
    min?: ResolverInputTypes["subscription_plan_type_min_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "subscription_plan_type". All fields are combined with a logical 'AND'. */
  ["subscription_plan_type_bool_exp"]: {
    _and?:
      | Array<ResolverInputTypes["subscription_plan_type_bool_exp"]>
      | undefined
      | null;
    _not?:
      | ResolverInputTypes["subscription_plan_type_bool_exp"]
      | undefined
      | null;
    _or?:
      | Array<ResolverInputTypes["subscription_plan_type_bool_exp"]>
      | undefined
      | null;
    subscription_plans?:
      | ResolverInputTypes["subscription_plans_bool_exp"]
      | undefined
      | null;
    subscription_plans_aggregate?:
      | ResolverInputTypes["subscription_plans_aggregate_bool_exp"]
      | undefined
      | null;
    value?: ResolverInputTypes["String_comparison_exp"] | undefined | null;
  };
  /** unique or primary key constraints on table "subscription_plan_type" */
  ["subscription_plan_type_constraint"]: subscription_plan_type_constraint;
  ["subscription_plan_type_enum"]: subscription_plan_type_enum;
  /** Boolean expression to compare columns of type "subscription_plan_type_enum". All fields are combined with logical 'AND'. */
  ["subscription_plan_type_enum_comparison_exp"]: {
    _eq?: ResolverInputTypes["subscription_plan_type_enum"] | undefined | null;
    _in?:
      | Array<ResolverInputTypes["subscription_plan_type_enum"]>
      | undefined
      | null;
    _is_null?: boolean | undefined | null;
    _neq?: ResolverInputTypes["subscription_plan_type_enum"] | undefined | null;
    _nin?:
      | Array<ResolverInputTypes["subscription_plan_type_enum"]>
      | undefined
      | null;
  };
  /** input type for inserting data into table "subscription_plan_type" */
  ["subscription_plan_type_insert_input"]: {
    subscription_plans?:
      | ResolverInputTypes["subscription_plans_arr_rel_insert_input"]
      | undefined
      | null;
    value?: string | undefined | null;
  };
  /** aggregate max on columns */
  ["subscription_plan_type_max_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["subscription_plan_type_min_fields"]: AliasType<{
    value?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "subscription_plan_type" */
  ["subscription_plan_type_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ResolverInputTypes["subscription_plan_type"];
    __typename?: boolean | `@${string}`;
  }>;
  /** input type for inserting object relation for remote table "subscription_plan_type" */
  ["subscription_plan_type_obj_rel_insert_input"]: {
    data: ResolverInputTypes["subscription_plan_type_insert_input"];
    /** upsert condition */
    on_conflict?:
      | ResolverInputTypes["subscription_plan_type_on_conflict"]
      | undefined
      | null;
  };
  /** on_conflict condition type for table "subscription_plan_type" */
  ["subscription_plan_type_on_conflict"]: {
    constraint: ResolverInputTypes["subscription_plan_type_constraint"];
    update_columns: Array<
      ResolverInputTypes["subscription_plan_type_update_column"]
    >;
    where?:
      | ResolverInputTypes["subscription_plan_type_bool_exp"]
      | undefined
      | null;
  };
  /** Ordering options when selecting data from "subscription_plan_type". */
  ["subscription_plan_type_order_by"]: {
    subscription_plans_aggregate?:
      | ResolverInputTypes["subscription_plans_aggregate_order_by"]
      | undefined
      | null;
    value?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** primary key columns input for table: subscription_plan_type */
  ["subscription_plan_type_pk_columns_input"]: {
    value: string;
  };
  /** select columns of table "subscription_plan_type" */
  ["subscription_plan_type_select_column"]: subscription_plan_type_select_column;
  /** input type for updating data in table "subscription_plan_type" */
  ["subscription_plan_type_set_input"]: {
    value?: string | undefined | null;
  };
  /** Streaming cursor of the table "subscription_plan_type" */
  ["subscription_plan_type_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ResolverInputTypes["subscription_plan_type_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plan_type_stream_cursor_value_input"]: {
    value?: string | undefined | null;
  };
  /** update columns of table "subscription_plan_type" */
  ["subscription_plan_type_update_column"]: subscription_plan_type_update_column;
  ["subscription_plan_type_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ResolverInputTypes["subscription_plan_type_set_input"]
      | undefined
      | null;
    /** filter the rows which have to be updated */
    where: ResolverInputTypes["subscription_plan_type_bool_exp"];
  };
  /** columns and relationships of "subscription_plans" */
  ["subscription_plans"]: AliasType<{
    frequency?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    is_non_veg?: boolean | `@${string}`;
    price?: boolean | `@${string}`;
    /** An object relationship */
    subscription_plan_frequency?: ResolverInputTypes["subscription_plan_frequency"];
    /** An object relationship */
    subscription_plan_type?: ResolverInputTypes["subscription_plan_type"];
    type?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "subscription_plans" */
  ["subscription_plans_aggregate"]: AliasType<{
    aggregate?: ResolverInputTypes["subscription_plans_aggregate_fields"];
    nodes?: ResolverInputTypes["subscription_plans"];
    __typename?: boolean | `@${string}`;
  }>;
  ["subscription_plans_aggregate_bool_exp"]: {
    bool_and?:
      | ResolverInputTypes["subscription_plans_aggregate_bool_exp_bool_and"]
      | undefined
      | null;
    bool_or?:
      | ResolverInputTypes["subscription_plans_aggregate_bool_exp_bool_or"]
      | undefined
      | null;
    count?:
      | ResolverInputTypes["subscription_plans_aggregate_bool_exp_count"]
      | undefined
      | null;
  };
  ["subscription_plans_aggregate_bool_exp_bool_and"]: {
    arguments: ResolverInputTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"];
    distinct?: boolean | undefined | null;
    filter?:
      | ResolverInputTypes["subscription_plans_bool_exp"]
      | undefined
      | null;
    predicate: ResolverInputTypes["Boolean_comparison_exp"];
  };
  ["subscription_plans_aggregate_bool_exp_bool_or"]: {
    arguments: ResolverInputTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"];
    distinct?: boolean | undefined | null;
    filter?:
      | ResolverInputTypes["subscription_plans_bool_exp"]
      | undefined
      | null;
    predicate: ResolverInputTypes["Boolean_comparison_exp"];
  };
  ["subscription_plans_aggregate_bool_exp_count"]: {
    arguments?:
      | Array<ResolverInputTypes["subscription_plans_select_column"]>
      | undefined
      | null;
    distinct?: boolean | undefined | null;
    filter?:
      | ResolverInputTypes["subscription_plans_bool_exp"]
      | undefined
      | null;
    predicate: ResolverInputTypes["Int_comparison_exp"];
  };
  /** aggregate fields of "subscription_plans" */
  ["subscription_plans_aggregate_fields"]: AliasType<{
    avg?: ResolverInputTypes["subscription_plans_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ResolverInputTypes["subscription_plans_select_column"]>
          | undefined
          | null;
        distinct?: boolean | undefined | null;
      },
      boolean | `@${string}`
    ];
    max?: ResolverInputTypes["subscription_plans_max_fields"];
    min?: ResolverInputTypes["subscription_plans_min_fields"];
    stddev?: ResolverInputTypes["subscription_plans_stddev_fields"];
    stddev_pop?: ResolverInputTypes["subscription_plans_stddev_pop_fields"];
    stddev_samp?: ResolverInputTypes["subscription_plans_stddev_samp_fields"];
    sum?: ResolverInputTypes["subscription_plans_sum_fields"];
    var_pop?: ResolverInputTypes["subscription_plans_var_pop_fields"];
    var_samp?: ResolverInputTypes["subscription_plans_var_samp_fields"];
    variance?: ResolverInputTypes["subscription_plans_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** order by aggregate values of table "subscription_plans" */
  ["subscription_plans_aggregate_order_by"]: {
    avg?:
      | ResolverInputTypes["subscription_plans_avg_order_by"]
      | undefined
      | null;
    count?: ResolverInputTypes["order_by"] | undefined | null;
    max?:
      | ResolverInputTypes["subscription_plans_max_order_by"]
      | undefined
      | null;
    min?:
      | ResolverInputTypes["subscription_plans_min_order_by"]
      | undefined
      | null;
    stddev?:
      | ResolverInputTypes["subscription_plans_stddev_order_by"]
      | undefined
      | null;
    stddev_pop?:
      | ResolverInputTypes["subscription_plans_stddev_pop_order_by"]
      | undefined
      | null;
    stddev_samp?:
      | ResolverInputTypes["subscription_plans_stddev_samp_order_by"]
      | undefined
      | null;
    sum?:
      | ResolverInputTypes["subscription_plans_sum_order_by"]
      | undefined
      | null;
    var_pop?:
      | ResolverInputTypes["subscription_plans_var_pop_order_by"]
      | undefined
      | null;
    var_samp?:
      | ResolverInputTypes["subscription_plans_var_samp_order_by"]
      | undefined
      | null;
    variance?:
      | ResolverInputTypes["subscription_plans_variance_order_by"]
      | undefined
      | null;
  };
  /** input type for inserting array relation for remote table "subscription_plans" */
  ["subscription_plans_arr_rel_insert_input"]: {
    data: Array<ResolverInputTypes["subscription_plans_insert_input"]>;
    /** upsert condition */
    on_conflict?:
      | ResolverInputTypes["subscription_plans_on_conflict"]
      | undefined
      | null;
  };
  /** aggregate avg on columns */
  ["subscription_plans_avg_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by avg() on columns of table "subscription_plans" */
  ["subscription_plans_avg_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** Boolean expression to filter rows from the table "subscription_plans". All fields are combined with a logical 'AND'. */
  ["subscription_plans_bool_exp"]: {
    _and?:
      | Array<ResolverInputTypes["subscription_plans_bool_exp"]>
      | undefined
      | null;
    _not?: ResolverInputTypes["subscription_plans_bool_exp"] | undefined | null;
    _or?:
      | Array<ResolverInputTypes["subscription_plans_bool_exp"]>
      | undefined
      | null;
    frequency?:
      | ResolverInputTypes["subscription_plan_frequency_enum_comparison_exp"]
      | undefined
      | null;
    id?: ResolverInputTypes["Int_comparison_exp"] | undefined | null;
    is_non_veg?:
      | ResolverInputTypes["Boolean_comparison_exp"]
      | undefined
      | null;
    price?: ResolverInputTypes["String_comparison_exp"] | undefined | null;
    subscription_plan_frequency?:
      | ResolverInputTypes["subscription_plan_frequency_bool_exp"]
      | undefined
      | null;
    subscription_plan_type?:
      | ResolverInputTypes["subscription_plan_type_bool_exp"]
      | undefined
      | null;
    type?:
      | ResolverInputTypes["subscription_plan_type_enum_comparison_exp"]
      | undefined
      | null;
  };
  /** unique or primary key constraints on table "subscription_plans" */
  ["subscription_plans_constraint"]: subscription_plans_constraint;
  /** input type for incrementing numeric columns in table "subscription_plans" */
  ["subscription_plans_inc_input"]: {
    id?: number | undefined | null;
  };
  /** input type for inserting data into table "subscription_plans" */
  ["subscription_plans_insert_input"]: {
    frequency?:
      | ResolverInputTypes["subscription_plan_frequency_enum"]
      | undefined
      | null;
    id?: number | undefined | null;
    is_non_veg?: boolean | undefined | null;
    price?: string | undefined | null;
    subscription_plan_frequency?:
      | ResolverInputTypes["subscription_plan_frequency_obj_rel_insert_input"]
      | undefined
      | null;
    subscription_plan_type?:
      | ResolverInputTypes["subscription_plan_type_obj_rel_insert_input"]
      | undefined
      | null;
    type?: ResolverInputTypes["subscription_plan_type_enum"] | undefined | null;
  };
  /** aggregate max on columns */
  ["subscription_plans_max_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    price?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by max() on columns of table "subscription_plans" */
  ["subscription_plans_max_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
    price?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** aggregate min on columns */
  ["subscription_plans_min_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    price?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by min() on columns of table "subscription_plans" */
  ["subscription_plans_min_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
    price?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** response of any mutation on the table "subscription_plans" */
  ["subscription_plans_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ResolverInputTypes["subscription_plans"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "subscription_plans" */
  ["subscription_plans_on_conflict"]: {
    constraint: ResolverInputTypes["subscription_plans_constraint"];
    update_columns: Array<
      ResolverInputTypes["subscription_plans_update_column"]
    >;
    where?:
      | ResolverInputTypes["subscription_plans_bool_exp"]
      | undefined
      | null;
  };
  /** Ordering options when selecting data from "subscription_plans". */
  ["subscription_plans_order_by"]: {
    frequency?: ResolverInputTypes["order_by"] | undefined | null;
    id?: ResolverInputTypes["order_by"] | undefined | null;
    is_non_veg?: ResolverInputTypes["order_by"] | undefined | null;
    price?: ResolverInputTypes["order_by"] | undefined | null;
    subscription_plan_frequency?:
      | ResolverInputTypes["subscription_plan_frequency_order_by"]
      | undefined
      | null;
    subscription_plan_type?:
      | ResolverInputTypes["subscription_plan_type_order_by"]
      | undefined
      | null;
    type?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** primary key columns input for table: subscription_plans */
  ["subscription_plans_pk_columns_input"]: {
    id: number;
  };
  /** select columns of table "subscription_plans" */
  ["subscription_plans_select_column"]: subscription_plans_select_column;
  /** select "subscription_plans_aggregate_bool_exp_bool_and_arguments_columns" columns of table "subscription_plans" */
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"]: subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns;
  /** select "subscription_plans_aggregate_bool_exp_bool_or_arguments_columns" columns of table "subscription_plans" */
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"]: subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns;
  /** input type for updating data in table "subscription_plans" */
  ["subscription_plans_set_input"]: {
    frequency?:
      | ResolverInputTypes["subscription_plan_frequency_enum"]
      | undefined
      | null;
    id?: number | undefined | null;
    is_non_veg?: boolean | undefined | null;
    price?: string | undefined | null;
    type?: ResolverInputTypes["subscription_plan_type_enum"] | undefined | null;
  };
  /** aggregate stddev on columns */
  ["subscription_plans_stddev_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by stddev() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** aggregate stddev_pop on columns */
  ["subscription_plans_stddev_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by stddev_pop() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_pop_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** aggregate stddev_samp on columns */
  ["subscription_plans_stddev_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by stddev_samp() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_samp_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** Streaming cursor of the table "subscription_plans" */
  ["subscription_plans_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ResolverInputTypes["subscription_plans_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plans_stream_cursor_value_input"]: {
    frequency?:
      | ResolverInputTypes["subscription_plan_frequency_enum"]
      | undefined
      | null;
    id?: number | undefined | null;
    is_non_veg?: boolean | undefined | null;
    price?: string | undefined | null;
    type?: ResolverInputTypes["subscription_plan_type_enum"] | undefined | null;
  };
  /** aggregate sum on columns */
  ["subscription_plans_sum_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by sum() on columns of table "subscription_plans" */
  ["subscription_plans_sum_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** update columns of table "subscription_plans" */
  ["subscription_plans_update_column"]: subscription_plans_update_column;
  ["subscription_plans_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?:
      | ResolverInputTypes["subscription_plans_inc_input"]
      | undefined
      | null;
    /** sets the columns of the filtered rows to the given values */
    _set?:
      | ResolverInputTypes["subscription_plans_set_input"]
      | undefined
      | null;
    /** filter the rows which have to be updated */
    where: ResolverInputTypes["subscription_plans_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["subscription_plans_var_pop_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by var_pop() on columns of table "subscription_plans" */
  ["subscription_plans_var_pop_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** aggregate var_samp on columns */
  ["subscription_plans_var_samp_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by var_samp() on columns of table "subscription_plans" */
  ["subscription_plans_var_samp_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** aggregate variance on columns */
  ["subscription_plans_variance_fields"]: AliasType<{
    id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** order by variance() on columns of table "subscription_plans" */
  ["subscription_plans_variance_order_by"]: {
    id?: ResolverInputTypes["order_by"] | undefined | null;
  };
  ["subscription_root"]: AliasType<{
    meals?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["meals_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["meals_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["meals_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["meals"]
    ];
    meals_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["meals_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["meals_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["meals_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["meals_aggregate"]
    ];
    meals_by_pk?: [{ id: number }, ResolverInputTypes["meals"]];
    meals_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size: number /** cursor to stream the results returned by the query */;
        cursor: Array<
          ResolverInputTypes["meals_stream_cursor_input"] | undefined | null
        > /** filter the rows returned */;
        where?: ResolverInputTypes["meals_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["meals"]
    ];
    order_delivery_status?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["order_delivery_status_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["order_delivery_status_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["order_delivery_status_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["order_delivery_status"]
    ];
    order_delivery_status_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["order_delivery_status_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["order_delivery_status_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["order_delivery_status_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["order_delivery_status_aggregate"]
    ];
    order_delivery_status_by_pk?: [
      { value: string },
      ResolverInputTypes["order_delivery_status"]
    ];
    order_delivery_status_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size: number /** cursor to stream the results returned by the query */;
        cursor: Array<
          | ResolverInputTypes["order_delivery_status_stream_cursor_input"]
          | undefined
          | null
        > /** filter the rows returned */;
        where?:
          | ResolverInputTypes["order_delivery_status_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["order_delivery_status"]
    ];
    orders?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["orders_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["orders_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["orders_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["orders"]
    ];
    orders_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["orders_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["orders_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["orders_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["orders_aggregate"]
    ];
    orders_by_pk?: [
      { id: ResolverInputTypes["uuid"] },
      ResolverInputTypes["orders"]
    ];
    orders_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size: number /** cursor to stream the results returned by the query */;
        cursor: Array<
          ResolverInputTypes["orders_stream_cursor_input"] | undefined | null
        > /** filter the rows returned */;
        where?: ResolverInputTypes["orders_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["orders"]
    ];
    slots?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["slots_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["slots_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["slots_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["slots"]
    ];
    slots_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["slots_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["slots_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["slots_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["slots_aggregate"]
    ];
    slots_by_pk?: [{ id: number }, ResolverInputTypes["slots"]];
    slots_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size: number /** cursor to stream the results returned by the query */;
        cursor: Array<
          ResolverInputTypes["slots_stream_cursor_input"] | undefined | null
        > /** filter the rows returned */;
        where?: ResolverInputTypes["slots_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["slots"]
    ];
    subscription_plan_frequency?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<
              ResolverInputTypes["subscription_plan_frequency_select_column"]
            >
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plan_frequency_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_frequency"]
    ];
    subscription_plan_frequency_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<
              ResolverInputTypes["subscription_plan_frequency_select_column"]
            >
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plan_frequency_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_frequency_aggregate"]
    ];
    subscription_plan_frequency_by_pk?: [
      { value: string },
      ResolverInputTypes["subscription_plan_frequency"]
    ];
    subscription_plan_frequency_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size: number /** cursor to stream the results returned by the query */;
        cursor: Array<
          | ResolverInputTypes["subscription_plan_frequency_stream_cursor_input"]
          | undefined
          | null
        > /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_frequency_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_frequency"]
    ];
    subscription_plan_type?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plan_type_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plan_type_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_type"]
    ];
    subscription_plan_type_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plan_type_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plan_type_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_type_aggregate"]
    ];
    subscription_plan_type_by_pk?: [
      { value: string },
      ResolverInputTypes["subscription_plan_type"]
    ];
    subscription_plan_type_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size: number /** cursor to stream the results returned by the query */;
        cursor: Array<
          | ResolverInputTypes["subscription_plan_type_stream_cursor_input"]
          | undefined
          | null
        > /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plan_type_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plan_type"]
    ];
    subscription_plans?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plans_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plans_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plans_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans"]
    ];
    subscription_plans_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscription_plans_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscription_plans_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plans_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans_aggregate"]
    ];
    subscription_plans_by_pk?: [
      { id: number },
      ResolverInputTypes["subscription_plans"]
    ];
    subscription_plans_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size: number /** cursor to stream the results returned by the query */;
        cursor: Array<
          | ResolverInputTypes["subscription_plans_stream_cursor_input"]
          | undefined
          | null
        > /** filter the rows returned */;
        where?:
          | ResolverInputTypes["subscription_plans_bool_exp"]
          | undefined
          | null;
      },
      ResolverInputTypes["subscription_plans"]
    ];
    subscriptions?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscriptions_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscriptions_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["subscriptions_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["subscriptions"]
    ];
    subscriptions_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["subscriptions_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["subscriptions_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["subscriptions_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["subscriptions_aggregate"]
    ];
    subscriptions_by_pk?: [
      { id: ResolverInputTypes["uuid"] },
      ResolverInputTypes["subscriptions"]
    ];
    subscriptions_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size: number /** cursor to stream the results returned by the query */;
        cursor: Array<
          | ResolverInputTypes["subscriptions_stream_cursor_input"]
          | undefined
          | null
        > /** filter the rows returned */;
        where?: ResolverInputTypes["subscriptions_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["subscriptions"]
    ];
    users?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["users_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["users_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["users_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["users"]
    ];
    users_aggregate?: [
      {
        /** distinct select on columns */
        distinct_on?:
          | Array<ResolverInputTypes["users_select_column"]>
          | undefined
          | null /** limit the number of rows returned */;
        limit?:
          | number
          | undefined
          | null /** skip the first n rows. Use only with order_by */;
        offset?:
          | number
          | undefined
          | null /** sort the rows by one or more columns */;
        order_by?:
          | Array<ResolverInputTypes["users_order_by"]>
          | undefined
          | null /** filter the rows returned */;
        where?: ResolverInputTypes["users_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["users_aggregate"]
    ];
    users_by_pk?: [
      { id: ResolverInputTypes["uuid"] },
      ResolverInputTypes["users"]
    ];
    users_stream?: [
      {
        /** maximum number of rows returned in a single batch */
        batch_size: number /** cursor to stream the results returned by the query */;
        cursor: Array<
          ResolverInputTypes["users_stream_cursor_input"] | undefined | null
        > /** filter the rows returned */;
        where?: ResolverInputTypes["users_bool_exp"] | undefined | null;
      },
      ResolverInputTypes["users"]
    ];
    __typename?: boolean | `@${string}`;
  }>;
  /** columns and relationships of "subscriptions" */
  ["subscriptions"]: AliasType<{
    assigned_chef?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    end_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    start_date?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    user_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "subscriptions" */
  ["subscriptions_aggregate"]: AliasType<{
    aggregate?: ResolverInputTypes["subscriptions_aggregate_fields"];
    nodes?: ResolverInputTypes["subscriptions"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "subscriptions" */
  ["subscriptions_aggregate_fields"]: AliasType<{
    avg?: ResolverInputTypes["subscriptions_avg_fields"];
    count?: [
      {
        columns?:
          | Array<ResolverInputTypes["subscriptions_select_column"]>
          | undefined
          | null;
        distinct?: boolean | undefined | null;
      },
      boolean | `@${string}`
    ];
    max?: ResolverInputTypes["subscriptions_max_fields"];
    min?: ResolverInputTypes["subscriptions_min_fields"];
    stddev?: ResolverInputTypes["subscriptions_stddev_fields"];
    stddev_pop?: ResolverInputTypes["subscriptions_stddev_pop_fields"];
    stddev_samp?: ResolverInputTypes["subscriptions_stddev_samp_fields"];
    sum?: ResolverInputTypes["subscriptions_sum_fields"];
    var_pop?: ResolverInputTypes["subscriptions_var_pop_fields"];
    var_samp?: ResolverInputTypes["subscriptions_var_samp_fields"];
    variance?: ResolverInputTypes["subscriptions_variance_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate avg on columns */
  ["subscriptions_avg_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "subscriptions". All fields are combined with a logical 'AND'. */
  ["subscriptions_bool_exp"]: {
    _and?:
      | Array<ResolverInputTypes["subscriptions_bool_exp"]>
      | undefined
      | null;
    _not?: ResolverInputTypes["subscriptions_bool_exp"] | undefined | null;
    _or?:
      | Array<ResolverInputTypes["subscriptions_bool_exp"]>
      | undefined
      | null;
    assigned_chef?:
      | ResolverInputTypes["uuid_comparison_exp"]
      | undefined
      | null;
    created_at?:
      | ResolverInputTypes["timestamptz_comparison_exp"]
      | undefined
      | null;
    end_date?: ResolverInputTypes["date_comparison_exp"] | undefined | null;
    id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null;
    slot_id?: ResolverInputTypes["Int_comparison_exp"] | undefined | null;
    start_date?: ResolverInputTypes["date_comparison_exp"] | undefined | null;
    subscription_plan_id?:
      | ResolverInputTypes["Int_comparison_exp"]
      | undefined
      | null;
    updated_at?:
      | ResolverInputTypes["timestamptz_comparison_exp"]
      | undefined
      | null;
    user_id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null;
  };
  /** unique or primary key constraints on table "subscriptions" */
  ["subscriptions_constraint"]: subscriptions_constraint;
  /** input type for incrementing numeric columns in table "subscriptions" */
  ["subscriptions_inc_input"]: {
    slot_id?: number | undefined | null;
    subscription_plan_id?: number | undefined | null;
  };
  /** input type for inserting data into table "subscriptions" */
  ["subscriptions_insert_input"]: {
    assigned_chef?: ResolverInputTypes["uuid"] | undefined | null;
    created_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    end_date?: ResolverInputTypes["date"] | undefined | null;
    id?: ResolverInputTypes["uuid"] | undefined | null;
    slot_id?: number | undefined | null;
    start_date?: ResolverInputTypes["date"] | undefined | null;
    subscription_plan_id?: number | undefined | null;
    updated_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    user_id?: ResolverInputTypes["uuid"] | undefined | null;
  };
  /** aggregate max on columns */
  ["subscriptions_max_fields"]: AliasType<{
    assigned_chef?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    end_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    start_date?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    user_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["subscriptions_min_fields"]: AliasType<{
    assigned_chef?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    end_date?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    slot_id?: boolean | `@${string}`;
    start_date?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    user_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "subscriptions" */
  ["subscriptions_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ResolverInputTypes["subscriptions"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "subscriptions" */
  ["subscriptions_on_conflict"]: {
    constraint: ResolverInputTypes["subscriptions_constraint"];
    update_columns: Array<ResolverInputTypes["subscriptions_update_column"]>;
    where?: ResolverInputTypes["subscriptions_bool_exp"] | undefined | null;
  };
  /** Ordering options when selecting data from "subscriptions". */
  ["subscriptions_order_by"]: {
    assigned_chef?: ResolverInputTypes["order_by"] | undefined | null;
    created_at?: ResolverInputTypes["order_by"] | undefined | null;
    end_date?: ResolverInputTypes["order_by"] | undefined | null;
    id?: ResolverInputTypes["order_by"] | undefined | null;
    slot_id?: ResolverInputTypes["order_by"] | undefined | null;
    start_date?: ResolverInputTypes["order_by"] | undefined | null;
    subscription_plan_id?: ResolverInputTypes["order_by"] | undefined | null;
    updated_at?: ResolverInputTypes["order_by"] | undefined | null;
    user_id?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** primary key columns input for table: subscriptions */
  ["subscriptions_pk_columns_input"]: {
    id: ResolverInputTypes["uuid"];
  };
  /** select columns of table "subscriptions" */
  ["subscriptions_select_column"]: subscriptions_select_column;
  /** input type for updating data in table "subscriptions" */
  ["subscriptions_set_input"]: {
    assigned_chef?: ResolverInputTypes["uuid"] | undefined | null;
    created_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    end_date?: ResolverInputTypes["date"] | undefined | null;
    id?: ResolverInputTypes["uuid"] | undefined | null;
    slot_id?: number | undefined | null;
    start_date?: ResolverInputTypes["date"] | undefined | null;
    subscription_plan_id?: number | undefined | null;
    updated_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    user_id?: ResolverInputTypes["uuid"] | undefined | null;
  };
  /** aggregate stddev on columns */
  ["subscriptions_stddev_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_pop on columns */
  ["subscriptions_stddev_pop_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate stddev_samp on columns */
  ["subscriptions_stddev_samp_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** Streaming cursor of the table "subscriptions" */
  ["subscriptions_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ResolverInputTypes["subscriptions_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscriptions_stream_cursor_value_input"]: {
    assigned_chef?: ResolverInputTypes["uuid"] | undefined | null;
    created_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    end_date?: ResolverInputTypes["date"] | undefined | null;
    id?: ResolverInputTypes["uuid"] | undefined | null;
    slot_id?: number | undefined | null;
    start_date?: ResolverInputTypes["date"] | undefined | null;
    subscription_plan_id?: number | undefined | null;
    updated_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    user_id?: ResolverInputTypes["uuid"] | undefined | null;
  };
  /** aggregate sum on columns */
  ["subscriptions_sum_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** update columns of table "subscriptions" */
  ["subscriptions_update_column"]: subscriptions_update_column;
  ["subscriptions_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: ResolverInputTypes["subscriptions_inc_input"] | undefined | null;
    /** sets the columns of the filtered rows to the given values */
    _set?: ResolverInputTypes["subscriptions_set_input"] | undefined | null;
    /** filter the rows which have to be updated */
    where: ResolverInputTypes["subscriptions_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["subscriptions_var_pop_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate var_samp on columns */
  ["subscriptions_var_samp_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate variance on columns */
  ["subscriptions_variance_fields"]: AliasType<{
    slot_id?: boolean | `@${string}`;
    subscription_plan_id?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  ["time"]: unknown;
  /** Boolean expression to compare columns of type "time". All fields are combined with logical 'AND'. */
  ["time_comparison_exp"]: {
    _eq?: ResolverInputTypes["time"] | undefined | null;
    _gt?: ResolverInputTypes["time"] | undefined | null;
    _gte?: ResolverInputTypes["time"] | undefined | null;
    _in?: Array<ResolverInputTypes["time"]> | undefined | null;
    _is_null?: boolean | undefined | null;
    _lt?: ResolverInputTypes["time"] | undefined | null;
    _lte?: ResolverInputTypes["time"] | undefined | null;
    _neq?: ResolverInputTypes["time"] | undefined | null;
    _nin?: Array<ResolverInputTypes["time"]> | undefined | null;
  };
  ["timestamptz"]: unknown;
  /** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
  ["timestamptz_comparison_exp"]: {
    _eq?: ResolverInputTypes["timestamptz"] | undefined | null;
    _gt?: ResolverInputTypes["timestamptz"] | undefined | null;
    _gte?: ResolverInputTypes["timestamptz"] | undefined | null;
    _in?: Array<ResolverInputTypes["timestamptz"]> | undefined | null;
    _is_null?: boolean | undefined | null;
    _lt?: ResolverInputTypes["timestamptz"] | undefined | null;
    _lte?: ResolverInputTypes["timestamptz"] | undefined | null;
    _neq?: ResolverInputTypes["timestamptz"] | undefined | null;
    _nin?: Array<ResolverInputTypes["timestamptz"]> | undefined | null;
  };
  ["timetz"]: unknown;
  /** Boolean expression to compare columns of type "timetz". All fields are combined with logical 'AND'. */
  ["timetz_comparison_exp"]: {
    _eq?: ResolverInputTypes["timetz"] | undefined | null;
    _gt?: ResolverInputTypes["timetz"] | undefined | null;
    _gte?: ResolverInputTypes["timetz"] | undefined | null;
    _in?: Array<ResolverInputTypes["timetz"]> | undefined | null;
    _is_null?: boolean | undefined | null;
    _lt?: ResolverInputTypes["timetz"] | undefined | null;
    _lte?: ResolverInputTypes["timetz"] | undefined | null;
    _neq?: ResolverInputTypes["timetz"] | undefined | null;
    _nin?: Array<ResolverInputTypes["timetz"]> | undefined | null;
  };
  /** columns and relationships of "users" */
  ["users"]: AliasType<{
    address_city?: boolean | `@${string}`;
    address_line_1?: boolean | `@${string}`;
    address_line_2?: boolean | `@${string}`;
    address_pincode?: boolean | `@${string}`;
    address_state?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    email?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    is_chef?: boolean | `@${string}`;
    phone?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    whatsapp?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregated selection of "users" */
  ["users_aggregate"]: AliasType<{
    aggregate?: ResolverInputTypes["users_aggregate_fields"];
    nodes?: ResolverInputTypes["users"];
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate fields of "users" */
  ["users_aggregate_fields"]: AliasType<{
    count?: [
      {
        columns?:
          | Array<ResolverInputTypes["users_select_column"]>
          | undefined
          | null;
        distinct?: boolean | undefined | null;
      },
      boolean | `@${string}`
    ];
    max?: ResolverInputTypes["users_max_fields"];
    min?: ResolverInputTypes["users_min_fields"];
    __typename?: boolean | `@${string}`;
  }>;
  /** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
  ["users_bool_exp"]: {
    _and?: Array<ResolverInputTypes["users_bool_exp"]> | undefined | null;
    _not?: ResolverInputTypes["users_bool_exp"] | undefined | null;
    _or?: Array<ResolverInputTypes["users_bool_exp"]> | undefined | null;
    address_city?:
      | ResolverInputTypes["String_comparison_exp"]
      | undefined
      | null;
    address_line_1?:
      | ResolverInputTypes["String_comparison_exp"]
      | undefined
      | null;
    address_line_2?:
      | ResolverInputTypes["String_comparison_exp"]
      | undefined
      | null;
    address_pincode?:
      | ResolverInputTypes["String_comparison_exp"]
      | undefined
      | null;
    address_state?:
      | ResolverInputTypes["String_comparison_exp"]
      | undefined
      | null;
    created_at?:
      | ResolverInputTypes["timestamptz_comparison_exp"]
      | undefined
      | null;
    email?: ResolverInputTypes["String_comparison_exp"] | undefined | null;
    id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null;
    is_chef?: ResolverInputTypes["Boolean_comparison_exp"] | undefined | null;
    phone?: ResolverInputTypes["String_comparison_exp"] | undefined | null;
    updated_at?:
      | ResolverInputTypes["timestamptz_comparison_exp"]
      | undefined
      | null;
    whatsapp?: ResolverInputTypes["String_comparison_exp"] | undefined | null;
  };
  /** unique or primary key constraints on table "users" */
  ["users_constraint"]: users_constraint;
  /** input type for inserting data into table "users" */
  ["users_insert_input"]: {
    address_city?: string | undefined | null;
    address_line_1?: string | undefined | null;
    address_line_2?: string | undefined | null;
    address_pincode?: string | undefined | null;
    address_state?: string | undefined | null;
    created_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    email?: string | undefined | null;
    id?: ResolverInputTypes["uuid"] | undefined | null;
    is_chef?: boolean | undefined | null;
    phone?: string | undefined | null;
    updated_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    whatsapp?: string | undefined | null;
  };
  /** aggregate max on columns */
  ["users_max_fields"]: AliasType<{
    address_city?: boolean | `@${string}`;
    address_line_1?: boolean | `@${string}`;
    address_line_2?: boolean | `@${string}`;
    address_pincode?: boolean | `@${string}`;
    address_state?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    email?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    phone?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    whatsapp?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** aggregate min on columns */
  ["users_min_fields"]: AliasType<{
    address_city?: boolean | `@${string}`;
    address_line_1?: boolean | `@${string}`;
    address_line_2?: boolean | `@${string}`;
    address_pincode?: boolean | `@${string}`;
    address_state?: boolean | `@${string}`;
    created_at?: boolean | `@${string}`;
    email?: boolean | `@${string}`;
    id?: boolean | `@${string}`;
    phone?: boolean | `@${string}`;
    updated_at?: boolean | `@${string}`;
    whatsapp?: boolean | `@${string}`;
    __typename?: boolean | `@${string}`;
  }>;
  /** response of any mutation on the table "users" */
  ["users_mutation_response"]: AliasType<{
    /** number of rows affected by the mutation */
    affected_rows?: boolean | `@${string}`;
    /** data from the rows affected by the mutation */
    returning?: ResolverInputTypes["users"];
    __typename?: boolean | `@${string}`;
  }>;
  /** on_conflict condition type for table "users" */
  ["users_on_conflict"]: {
    constraint: ResolverInputTypes["users_constraint"];
    update_columns: Array<ResolverInputTypes["users_update_column"]>;
    where?: ResolverInputTypes["users_bool_exp"] | undefined | null;
  };
  /** Ordering options when selecting data from "users". */
  ["users_order_by"]: {
    address_city?: ResolverInputTypes["order_by"] | undefined | null;
    address_line_1?: ResolverInputTypes["order_by"] | undefined | null;
    address_line_2?: ResolverInputTypes["order_by"] | undefined | null;
    address_pincode?: ResolverInputTypes["order_by"] | undefined | null;
    address_state?: ResolverInputTypes["order_by"] | undefined | null;
    created_at?: ResolverInputTypes["order_by"] | undefined | null;
    email?: ResolverInputTypes["order_by"] | undefined | null;
    id?: ResolverInputTypes["order_by"] | undefined | null;
    is_chef?: ResolverInputTypes["order_by"] | undefined | null;
    phone?: ResolverInputTypes["order_by"] | undefined | null;
    updated_at?: ResolverInputTypes["order_by"] | undefined | null;
    whatsapp?: ResolverInputTypes["order_by"] | undefined | null;
  };
  /** primary key columns input for table: users */
  ["users_pk_columns_input"]: {
    id: ResolverInputTypes["uuid"];
  };
  /** select columns of table "users" */
  ["users_select_column"]: users_select_column;
  /** input type for updating data in table "users" */
  ["users_set_input"]: {
    address_city?: string | undefined | null;
    address_line_1?: string | undefined | null;
    address_line_2?: string | undefined | null;
    address_pincode?: string | undefined | null;
    address_state?: string | undefined | null;
    created_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    email?: string | undefined | null;
    id?: ResolverInputTypes["uuid"] | undefined | null;
    is_chef?: boolean | undefined | null;
    phone?: string | undefined | null;
    updated_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    whatsapp?: string | undefined | null;
  };
  /** Streaming cursor of the table "users" */
  ["users_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ResolverInputTypes["users_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null;
  };
  /** Initial value of the column from where the streaming should start */
  ["users_stream_cursor_value_input"]: {
    address_city?: string | undefined | null;
    address_line_1?: string | undefined | null;
    address_line_2?: string | undefined | null;
    address_pincode?: string | undefined | null;
    address_state?: string | undefined | null;
    created_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    email?: string | undefined | null;
    id?: ResolverInputTypes["uuid"] | undefined | null;
    is_chef?: boolean | undefined | null;
    phone?: string | undefined | null;
    updated_at?: ResolverInputTypes["timestamptz"] | undefined | null;
    whatsapp?: string | undefined | null;
  };
  /** update columns of table "users" */
  ["users_update_column"]: users_update_column;
  ["users_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?: ResolverInputTypes["users_set_input"] | undefined | null;
    /** filter the rows which have to be updated */
    where: ResolverInputTypes["users_bool_exp"];
  };
  ["uuid"]: unknown;
  /** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
  ["uuid_comparison_exp"]: {
    _eq?: ResolverInputTypes["uuid"] | undefined | null;
    _gt?: ResolverInputTypes["uuid"] | undefined | null;
    _gte?: ResolverInputTypes["uuid"] | undefined | null;
    _in?: Array<ResolverInputTypes["uuid"]> | undefined | null;
    _is_null?: boolean | undefined | null;
    _lt?: ResolverInputTypes["uuid"] | undefined | null;
    _lte?: ResolverInputTypes["uuid"] | undefined | null;
    _neq?: ResolverInputTypes["uuid"] | undefined | null;
    _nin?: Array<ResolverInputTypes["uuid"]> | undefined | null;
  };
};

export type ModelTypes = {
  ["schema"]: {
    query?: ModelTypes["query_root"] | undefined;
    mutation?: ModelTypes["mutation_root"] | undefined;
    subscription?: ModelTypes["subscription_root"] | undefined;
  };
  /** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
  ["Boolean_comparison_exp"]: {
    _eq?: boolean | undefined;
    _gt?: boolean | undefined;
    _gte?: boolean | undefined;
    _in?: Array<boolean> | undefined;
    _is_null?: boolean | undefined;
    _lt?: boolean | undefined;
    _lte?: boolean | undefined;
    _neq?: boolean | undefined;
    _nin?: Array<boolean> | undefined;
  };
  /** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
  ["Int_comparison_exp"]: {
    _eq?: number | undefined;
    _gt?: number | undefined;
    _gte?: number | undefined;
    _in?: Array<number> | undefined;
    _is_null?: boolean | undefined;
    _lt?: number | undefined;
    _lte?: number | undefined;
    _neq?: number | undefined;
    _nin?: Array<number> | undefined;
  };
  /** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
  ["String_comparison_exp"]: {
    _eq?: string | undefined;
    _gt?: string | undefined;
    _gte?: string | undefined;
    /** does the column match the given case-insensitive pattern */
    _ilike?: string | undefined;
    _in?: Array<string> | undefined;
    /** does the column match the given POSIX regular expression, case insensitive */
    _iregex?: string | undefined;
    _is_null?: boolean | undefined;
    /** does the column match the given pattern */
    _like?: string | undefined;
    _lt?: string | undefined;
    _lte?: string | undefined;
    _neq?: string | undefined;
    /** does the column NOT match the given case-insensitive pattern */
    _nilike?: string | undefined;
    _nin?: Array<string> | undefined;
    /** does the column NOT match the given POSIX regular expression, case insensitive */
    _niregex?: string | undefined;
    /** does the column NOT match the given pattern */
    _nlike?: string | undefined;
    /** does the column NOT match the given POSIX regular expression, case sensitive */
    _nregex?: string | undefined;
    /** does the column NOT match the given SQL regular expression */
    _nsimilar?: string | undefined;
    /** does the column match the given POSIX regular expression, case sensitive */
    _regex?: string | undefined;
    /** does the column match the given SQL regular expression */
    _similar?: string | undefined;
  };
  ["cursor_ordering"]: cursor_ordering;
  ["date"]: any;
  /** Boolean expression to compare columns of type "date". All fields are combined with logical 'AND'. */
  ["date_comparison_exp"]: {
    _eq?: ModelTypes["date"] | undefined;
    _gt?: ModelTypes["date"] | undefined;
    _gte?: ModelTypes["date"] | undefined;
    _in?: Array<ModelTypes["date"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: ModelTypes["date"] | undefined;
    _lte?: ModelTypes["date"] | undefined;
    _neq?: ModelTypes["date"] | undefined;
    _nin?: Array<ModelTypes["date"]> | undefined;
  };
  /** columns and relationships of "meals" */
  ["meals"]: {
    id: number;
    name: string;
    type: string;
  };
  /** aggregated selection of "meals" */
  ["meals_aggregate"]: {
    aggregate?: ModelTypes["meals_aggregate_fields"] | undefined;
    nodes: Array<ModelTypes["meals"]>;
  };
  /** aggregate fields of "meals" */
  ["meals_aggregate_fields"]: {
    avg?: ModelTypes["meals_avg_fields"] | undefined;
    count: number;
    max?: ModelTypes["meals_max_fields"] | undefined;
    min?: ModelTypes["meals_min_fields"] | undefined;
    stddev?: ModelTypes["meals_stddev_fields"] | undefined;
    stddev_pop?: ModelTypes["meals_stddev_pop_fields"] | undefined;
    stddev_samp?: ModelTypes["meals_stddev_samp_fields"] | undefined;
    sum?: ModelTypes["meals_sum_fields"] | undefined;
    var_pop?: ModelTypes["meals_var_pop_fields"] | undefined;
    var_samp?: ModelTypes["meals_var_samp_fields"] | undefined;
    variance?: ModelTypes["meals_variance_fields"] | undefined;
  };
  /** aggregate avg on columns */
  ["meals_avg_fields"]: {
    id?: number | undefined;
  };
  /** Boolean expression to filter rows from the table "meals". All fields are combined with a logical 'AND'. */
  ["meals_bool_exp"]: {
    _and?: Array<ModelTypes["meals_bool_exp"]> | undefined;
    _not?: ModelTypes["meals_bool_exp"] | undefined;
    _or?: Array<ModelTypes["meals_bool_exp"]> | undefined;
    id?: ModelTypes["Int_comparison_exp"] | undefined;
    name?: ModelTypes["String_comparison_exp"] | undefined;
    type?: ModelTypes["String_comparison_exp"] | undefined;
  };
  ["meals_constraint"]: meals_constraint;
  /** input type for incrementing numeric columns in table "meals" */
  ["meals_inc_input"]: {
    id?: number | undefined;
  };
  /** input type for inserting data into table "meals" */
  ["meals_insert_input"]: {
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** aggregate max on columns */
  ["meals_max_fields"]: {
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** aggregate min on columns */
  ["meals_min_fields"]: {
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** response of any mutation on the table "meals" */
  ["meals_mutation_response"]: {
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<ModelTypes["meals"]>;
  };
  /** on_conflict condition type for table "meals" */
  ["meals_on_conflict"]: {
    constraint: ModelTypes["meals_constraint"];
    update_columns: Array<ModelTypes["meals_update_column"]>;
    where?: ModelTypes["meals_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "meals". */
  ["meals_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
    name?: ModelTypes["order_by"] | undefined;
    type?: ModelTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: meals */
  ["meals_pk_columns_input"]: {
    id: number;
  };
  ["meals_select_column"]: meals_select_column;
  /** input type for updating data in table "meals" */
  ["meals_set_input"]: {
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** aggregate stddev on columns */
  ["meals_stddev_fields"]: {
    id?: number | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["meals_stddev_pop_fields"]: {
    id?: number | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["meals_stddev_samp_fields"]: {
    id?: number | undefined;
  };
  /** Streaming cursor of the table "meals" */
  ["meals_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ModelTypes["meals_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ModelTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["meals_stream_cursor_value_input"]: {
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** aggregate sum on columns */
  ["meals_sum_fields"]: {
    id?: number | undefined;
  };
  ["meals_update_column"]: meals_update_column;
  ["meals_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: ModelTypes["meals_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: ModelTypes["meals_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: ModelTypes["meals_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["meals_var_pop_fields"]: {
    id?: number | undefined;
  };
  /** aggregate var_samp on columns */
  ["meals_var_samp_fields"]: {
    id?: number | undefined;
  };
  /** aggregate variance on columns */
  ["meals_variance_fields"]: {
    id?: number | undefined;
  };
  /** mutation root */
  ["mutation_root"]: {
    /** delete data from the table: "meals" */
    delete_meals?: ModelTypes["meals_mutation_response"] | undefined;
    /** delete single row from the table: "meals" */
    delete_meals_by_pk?: ModelTypes["meals"] | undefined;
    /** delete data from the table: "order_delivery_status" */
    delete_order_delivery_status?:
      | ModelTypes["order_delivery_status_mutation_response"]
      | undefined;
    /** delete single row from the table: "order_delivery_status" */
    delete_order_delivery_status_by_pk?:
      | ModelTypes["order_delivery_status"]
      | undefined;
    /** delete data from the table: "orders" */
    delete_orders?: ModelTypes["orders_mutation_response"] | undefined;
    /** delete single row from the table: "orders" */
    delete_orders_by_pk?: ModelTypes["orders"] | undefined;
    /** delete data from the table: "slots" */
    delete_slots?: ModelTypes["slots_mutation_response"] | undefined;
    /** delete single row from the table: "slots" */
    delete_slots_by_pk?: ModelTypes["slots"] | undefined;
    /** delete data from the table: "subscription_plan_frequency" */
    delete_subscription_plan_frequency?:
      | ModelTypes["subscription_plan_frequency_mutation_response"]
      | undefined;
    /** delete single row from the table: "subscription_plan_frequency" */
    delete_subscription_plan_frequency_by_pk?:
      | ModelTypes["subscription_plan_frequency"]
      | undefined;
    /** delete data from the table: "subscription_plan_type" */
    delete_subscription_plan_type?:
      | ModelTypes["subscription_plan_type_mutation_response"]
      | undefined;
    /** delete single row from the table: "subscription_plan_type" */
    delete_subscription_plan_type_by_pk?:
      | ModelTypes["subscription_plan_type"]
      | undefined;
    /** delete data from the table: "subscription_plans" */
    delete_subscription_plans?:
      | ModelTypes["subscription_plans_mutation_response"]
      | undefined;
    /** delete single row from the table: "subscription_plans" */
    delete_subscription_plans_by_pk?:
      | ModelTypes["subscription_plans"]
      | undefined;
    /** delete data from the table: "subscriptions" */
    delete_subscriptions?:
      | ModelTypes["subscriptions_mutation_response"]
      | undefined;
    /** delete single row from the table: "subscriptions" */
    delete_subscriptions_by_pk?: ModelTypes["subscriptions"] | undefined;
    /** delete data from the table: "users" */
    delete_users?: ModelTypes["users_mutation_response"] | undefined;
    /** delete single row from the table: "users" */
    delete_users_by_pk?: ModelTypes["users"] | undefined;
    /** insert data into the table: "meals" */
    insert_meals?: ModelTypes["meals_mutation_response"] | undefined;
    /** insert a single row into the table: "meals" */
    insert_meals_one?: ModelTypes["meals"] | undefined;
    /** insert data into the table: "order_delivery_status" */
    insert_order_delivery_status?:
      | ModelTypes["order_delivery_status_mutation_response"]
      | undefined;
    /** insert a single row into the table: "order_delivery_status" */
    insert_order_delivery_status_one?:
      | ModelTypes["order_delivery_status"]
      | undefined;
    /** insert data into the table: "orders" */
    insert_orders?: ModelTypes["orders_mutation_response"] | undefined;
    /** insert a single row into the table: "orders" */
    insert_orders_one?: ModelTypes["orders"] | undefined;
    /** insert data into the table: "slots" */
    insert_slots?: ModelTypes["slots_mutation_response"] | undefined;
    /** insert a single row into the table: "slots" */
    insert_slots_one?: ModelTypes["slots"] | undefined;
    /** insert data into the table: "subscription_plan_frequency" */
    insert_subscription_plan_frequency?:
      | ModelTypes["subscription_plan_frequency_mutation_response"]
      | undefined;
    /** insert a single row into the table: "subscription_plan_frequency" */
    insert_subscription_plan_frequency_one?:
      | ModelTypes["subscription_plan_frequency"]
      | undefined;
    /** insert data into the table: "subscription_plan_type" */
    insert_subscription_plan_type?:
      | ModelTypes["subscription_plan_type_mutation_response"]
      | undefined;
    /** insert a single row into the table: "subscription_plan_type" */
    insert_subscription_plan_type_one?:
      | ModelTypes["subscription_plan_type"]
      | undefined;
    /** insert data into the table: "subscription_plans" */
    insert_subscription_plans?:
      | ModelTypes["subscription_plans_mutation_response"]
      | undefined;
    /** insert a single row into the table: "subscription_plans" */
    insert_subscription_plans_one?:
      | ModelTypes["subscription_plans"]
      | undefined;
    /** insert data into the table: "subscriptions" */
    insert_subscriptions?:
      | ModelTypes["subscriptions_mutation_response"]
      | undefined;
    /** insert a single row into the table: "subscriptions" */
    insert_subscriptions_one?: ModelTypes["subscriptions"] | undefined;
    /** insert data into the table: "users" */
    insert_users?: ModelTypes["users_mutation_response"] | undefined;
    /** insert a single row into the table: "users" */
    insert_users_one?: ModelTypes["users"] | undefined;
    /** update data of the table: "meals" */
    update_meals?: ModelTypes["meals_mutation_response"] | undefined;
    /** update single row of the table: "meals" */
    update_meals_by_pk?: ModelTypes["meals"] | undefined;
    /** update multiples rows of table: "meals" */
    update_meals_many?:
      | Array<ModelTypes["meals_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "order_delivery_status" */
    update_order_delivery_status?:
      | ModelTypes["order_delivery_status_mutation_response"]
      | undefined;
    /** update single row of the table: "order_delivery_status" */
    update_order_delivery_status_by_pk?:
      | ModelTypes["order_delivery_status"]
      | undefined;
    /** update multiples rows of table: "order_delivery_status" */
    update_order_delivery_status_many?:
      | Array<ModelTypes["order_delivery_status_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "orders" */
    update_orders?: ModelTypes["orders_mutation_response"] | undefined;
    /** update single row of the table: "orders" */
    update_orders_by_pk?: ModelTypes["orders"] | undefined;
    /** update multiples rows of table: "orders" */
    update_orders_many?:
      | Array<ModelTypes["orders_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "slots" */
    update_slots?: ModelTypes["slots_mutation_response"] | undefined;
    /** update single row of the table: "slots" */
    update_slots_by_pk?: ModelTypes["slots"] | undefined;
    /** update multiples rows of table: "slots" */
    update_slots_many?:
      | Array<ModelTypes["slots_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "subscription_plan_frequency" */
    update_subscription_plan_frequency?:
      | ModelTypes["subscription_plan_frequency_mutation_response"]
      | undefined;
    /** update single row of the table: "subscription_plan_frequency" */
    update_subscription_plan_frequency_by_pk?:
      | ModelTypes["subscription_plan_frequency"]
      | undefined;
    /** update multiples rows of table: "subscription_plan_frequency" */
    update_subscription_plan_frequency_many?:
      | Array<
          | ModelTypes["subscription_plan_frequency_mutation_response"]
          | undefined
        >
      | undefined;
    /** update data of the table: "subscription_plan_type" */
    update_subscription_plan_type?:
      | ModelTypes["subscription_plan_type_mutation_response"]
      | undefined;
    /** update single row of the table: "subscription_plan_type" */
    update_subscription_plan_type_by_pk?:
      | ModelTypes["subscription_plan_type"]
      | undefined;
    /** update multiples rows of table: "subscription_plan_type" */
    update_subscription_plan_type_many?:
      | Array<
          ModelTypes["subscription_plan_type_mutation_response"] | undefined
        >
      | undefined;
    /** update data of the table: "subscription_plans" */
    update_subscription_plans?:
      | ModelTypes["subscription_plans_mutation_response"]
      | undefined;
    /** update single row of the table: "subscription_plans" */
    update_subscription_plans_by_pk?:
      | ModelTypes["subscription_plans"]
      | undefined;
    /** update multiples rows of table: "subscription_plans" */
    update_subscription_plans_many?:
      | Array<ModelTypes["subscription_plans_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "subscriptions" */
    update_subscriptions?:
      | ModelTypes["subscriptions_mutation_response"]
      | undefined;
    /** update single row of the table: "subscriptions" */
    update_subscriptions_by_pk?: ModelTypes["subscriptions"] | undefined;
    /** update multiples rows of table: "subscriptions" */
    update_subscriptions_many?:
      | Array<ModelTypes["subscriptions_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "users" */
    update_users?: ModelTypes["users_mutation_response"] | undefined;
    /** update single row of the table: "users" */
    update_users_by_pk?: ModelTypes["users"] | undefined;
    /** update multiples rows of table: "users" */
    update_users_many?:
      | Array<ModelTypes["users_mutation_response"] | undefined>
      | undefined;
  };
  ["order_by"]: order_by;
  /** columns and relationships of "order_delivery_status" */
  ["order_delivery_status"]: {
    value: string;
  };
  /** aggregated selection of "order_delivery_status" */
  ["order_delivery_status_aggregate"]: {
    aggregate?:
      | ModelTypes["order_delivery_status_aggregate_fields"]
      | undefined;
    nodes: Array<ModelTypes["order_delivery_status"]>;
  };
  /** aggregate fields of "order_delivery_status" */
  ["order_delivery_status_aggregate_fields"]: {
    count: number;
    max?: ModelTypes["order_delivery_status_max_fields"] | undefined;
    min?: ModelTypes["order_delivery_status_min_fields"] | undefined;
  };
  /** Boolean expression to filter rows from the table "order_delivery_status". All fields are combined with a logical 'AND'. */
  ["order_delivery_status_bool_exp"]: {
    _and?: Array<ModelTypes["order_delivery_status_bool_exp"]> | undefined;
    _not?: ModelTypes["order_delivery_status_bool_exp"] | undefined;
    _or?: Array<ModelTypes["order_delivery_status_bool_exp"]> | undefined;
    value?: ModelTypes["String_comparison_exp"] | undefined;
  };
  ["order_delivery_status_constraint"]: order_delivery_status_constraint;
  ["order_delivery_status_enum"]: order_delivery_status_enum;
  /** Boolean expression to compare columns of type "order_delivery_status_enum". All fields are combined with logical 'AND'. */
  ["order_delivery_status_enum_comparison_exp"]: {
    _eq?: ModelTypes["order_delivery_status_enum"] | undefined;
    _in?: Array<ModelTypes["order_delivery_status_enum"]> | undefined;
    _is_null?: boolean | undefined;
    _neq?: ModelTypes["order_delivery_status_enum"] | undefined;
    _nin?: Array<ModelTypes["order_delivery_status_enum"]> | undefined;
  };
  /** input type for inserting data into table "order_delivery_status" */
  ["order_delivery_status_insert_input"]: {
    value?: string | undefined;
  };
  /** aggregate max on columns */
  ["order_delivery_status_max_fields"]: {
    value?: string | undefined;
  };
  /** aggregate min on columns */
  ["order_delivery_status_min_fields"]: {
    value?: string | undefined;
  };
  /** response of any mutation on the table "order_delivery_status" */
  ["order_delivery_status_mutation_response"]: {
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<ModelTypes["order_delivery_status"]>;
  };
  /** on_conflict condition type for table "order_delivery_status" */
  ["order_delivery_status_on_conflict"]: {
    constraint: ModelTypes["order_delivery_status_constraint"];
    update_columns: Array<ModelTypes["order_delivery_status_update_column"]>;
    where?: ModelTypes["order_delivery_status_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "order_delivery_status". */
  ["order_delivery_status_order_by"]: {
    value?: ModelTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: order_delivery_status */
  ["order_delivery_status_pk_columns_input"]: {
    value: string;
  };
  ["order_delivery_status_select_column"]: order_delivery_status_select_column;
  /** input type for updating data in table "order_delivery_status" */
  ["order_delivery_status_set_input"]: {
    value?: string | undefined;
  };
  /** Streaming cursor of the table "order_delivery_status" */
  ["order_delivery_status_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ModelTypes["order_delivery_status_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ModelTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["order_delivery_status_stream_cursor_value_input"]: {
    value?: string | undefined;
  };
  ["order_delivery_status_update_column"]: order_delivery_status_update_column;
  ["order_delivery_status_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?: ModelTypes["order_delivery_status_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: ModelTypes["order_delivery_status_bool_exp"];
  };
  /** columns and relationships of "orders" */
  ["orders"]: {
    created_at: ModelTypes["timestamptz"];
    deliveredAt?: ModelTypes["timestamptz"] | undefined;
    delivery_date: ModelTypes["date"];
    id: ModelTypes["uuid"];
    meal_id: number;
    slot_id: number;
    status?: ModelTypes["order_delivery_status_enum"] | undefined;
    subscription_id: ModelTypes["uuid"];
    updated_at: ModelTypes["timestamptz"];
  };
  /** aggregated selection of "orders" */
  ["orders_aggregate"]: {
    aggregate?: ModelTypes["orders_aggregate_fields"] | undefined;
    nodes: Array<ModelTypes["orders"]>;
  };
  /** aggregate fields of "orders" */
  ["orders_aggregate_fields"]: {
    avg?: ModelTypes["orders_avg_fields"] | undefined;
    count: number;
    max?: ModelTypes["orders_max_fields"] | undefined;
    min?: ModelTypes["orders_min_fields"] | undefined;
    stddev?: ModelTypes["orders_stddev_fields"] | undefined;
    stddev_pop?: ModelTypes["orders_stddev_pop_fields"] | undefined;
    stddev_samp?: ModelTypes["orders_stddev_samp_fields"] | undefined;
    sum?: ModelTypes["orders_sum_fields"] | undefined;
    var_pop?: ModelTypes["orders_var_pop_fields"] | undefined;
    var_samp?: ModelTypes["orders_var_samp_fields"] | undefined;
    variance?: ModelTypes["orders_variance_fields"] | undefined;
  };
  /** aggregate avg on columns */
  ["orders_avg_fields"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** Boolean expression to filter rows from the table "orders". All fields are combined with a logical 'AND'. */
  ["orders_bool_exp"]: {
    _and?: Array<ModelTypes["orders_bool_exp"]> | undefined;
    _not?: ModelTypes["orders_bool_exp"] | undefined;
    _or?: Array<ModelTypes["orders_bool_exp"]> | undefined;
    created_at?: ModelTypes["timestamptz_comparison_exp"] | undefined;
    deliveredAt?: ModelTypes["timestamptz_comparison_exp"] | undefined;
    delivery_date?: ModelTypes["date_comparison_exp"] | undefined;
    id?: ModelTypes["uuid_comparison_exp"] | undefined;
    meal_id?: ModelTypes["Int_comparison_exp"] | undefined;
    slot_id?: ModelTypes["Int_comparison_exp"] | undefined;
    status?:
      | ModelTypes["order_delivery_status_enum_comparison_exp"]
      | undefined;
    subscription_id?: ModelTypes["uuid_comparison_exp"] | undefined;
    updated_at?: ModelTypes["timestamptz_comparison_exp"] | undefined;
  };
  ["orders_constraint"]: orders_constraint;
  /** input type for incrementing numeric columns in table "orders" */
  ["orders_inc_input"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** input type for inserting data into table "orders" */
  ["orders_insert_input"]: {
    created_at?: ModelTypes["timestamptz"] | undefined;
    deliveredAt?: ModelTypes["timestamptz"] | undefined;
    delivery_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    status?: ModelTypes["order_delivery_status_enum"] | undefined;
    subscription_id?: ModelTypes["uuid"] | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
  };
  /** aggregate max on columns */
  ["orders_max_fields"]: {
    created_at?: ModelTypes["timestamptz"] | undefined;
    deliveredAt?: ModelTypes["timestamptz"] | undefined;
    delivery_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    subscription_id?: ModelTypes["uuid"] | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
  };
  /** aggregate min on columns */
  ["orders_min_fields"]: {
    created_at?: ModelTypes["timestamptz"] | undefined;
    deliveredAt?: ModelTypes["timestamptz"] | undefined;
    delivery_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    subscription_id?: ModelTypes["uuid"] | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
  };
  /** response of any mutation on the table "orders" */
  ["orders_mutation_response"]: {
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<ModelTypes["orders"]>;
  };
  /** on_conflict condition type for table "orders" */
  ["orders_on_conflict"]: {
    constraint: ModelTypes["orders_constraint"];
    update_columns: Array<ModelTypes["orders_update_column"]>;
    where?: ModelTypes["orders_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "orders". */
  ["orders_order_by"]: {
    created_at?: ModelTypes["order_by"] | undefined;
    deliveredAt?: ModelTypes["order_by"] | undefined;
    delivery_date?: ModelTypes["order_by"] | undefined;
    id?: ModelTypes["order_by"] | undefined;
    meal_id?: ModelTypes["order_by"] | undefined;
    slot_id?: ModelTypes["order_by"] | undefined;
    status?: ModelTypes["order_by"] | undefined;
    subscription_id?: ModelTypes["order_by"] | undefined;
    updated_at?: ModelTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: orders */
  ["orders_pk_columns_input"]: {
    id: ModelTypes["uuid"];
  };
  ["orders_select_column"]: orders_select_column;
  /** input type for updating data in table "orders" */
  ["orders_set_input"]: {
    created_at?: ModelTypes["timestamptz"] | undefined;
    deliveredAt?: ModelTypes["timestamptz"] | undefined;
    delivery_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    status?: ModelTypes["order_delivery_status_enum"] | undefined;
    subscription_id?: ModelTypes["uuid"] | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
  };
  /** aggregate stddev on columns */
  ["orders_stddev_fields"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["orders_stddev_pop_fields"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["orders_stddev_samp_fields"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** Streaming cursor of the table "orders" */
  ["orders_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ModelTypes["orders_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ModelTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["orders_stream_cursor_value_input"]: {
    created_at?: ModelTypes["timestamptz"] | undefined;
    deliveredAt?: ModelTypes["timestamptz"] | undefined;
    delivery_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    status?: ModelTypes["order_delivery_status_enum"] | undefined;
    subscription_id?: ModelTypes["uuid"] | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
  };
  /** aggregate sum on columns */
  ["orders_sum_fields"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  ["orders_update_column"]: orders_update_column;
  ["orders_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: ModelTypes["orders_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: ModelTypes["orders_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: ModelTypes["orders_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["orders_var_pop_fields"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** aggregate var_samp on columns */
  ["orders_var_samp_fields"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** aggregate variance on columns */
  ["orders_variance_fields"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  ["query_root"]: {
    /** fetch data from the table: "meals" */
    meals: Array<ModelTypes["meals"]>;
    /** fetch aggregated fields from the table: "meals" */
    meals_aggregate: ModelTypes["meals_aggregate"];
    /** fetch data from the table: "meals" using primary key columns */
    meals_by_pk?: ModelTypes["meals"] | undefined;
    /** fetch data from the table: "order_delivery_status" */
    order_delivery_status: Array<ModelTypes["order_delivery_status"]>;
    /** fetch aggregated fields from the table: "order_delivery_status" */
    order_delivery_status_aggregate: ModelTypes["order_delivery_status_aggregate"];
    /** fetch data from the table: "order_delivery_status" using primary key columns */
    order_delivery_status_by_pk?:
      | ModelTypes["order_delivery_status"]
      | undefined;
    /** fetch data from the table: "orders" */
    orders: Array<ModelTypes["orders"]>;
    /** fetch aggregated fields from the table: "orders" */
    orders_aggregate: ModelTypes["orders_aggregate"];
    /** fetch data from the table: "orders" using primary key columns */
    orders_by_pk?: ModelTypes["orders"] | undefined;
    /** fetch data from the table: "slots" */
    slots: Array<ModelTypes["slots"]>;
    /** fetch aggregated fields from the table: "slots" */
    slots_aggregate: ModelTypes["slots_aggregate"];
    /** fetch data from the table: "slots" using primary key columns */
    slots_by_pk?: ModelTypes["slots"] | undefined;
    /** fetch data from the table: "subscription_plan_frequency" */
    subscription_plan_frequency: Array<
      ModelTypes["subscription_plan_frequency"]
    >;
    /** fetch aggregated fields from the table: "subscription_plan_frequency" */
    subscription_plan_frequency_aggregate: ModelTypes["subscription_plan_frequency_aggregate"];
    /** fetch data from the table: "subscription_plan_frequency" using primary key columns */
    subscription_plan_frequency_by_pk?:
      | ModelTypes["subscription_plan_frequency"]
      | undefined;
    /** fetch data from the table: "subscription_plan_type" */
    subscription_plan_type: Array<ModelTypes["subscription_plan_type"]>;
    /** fetch aggregated fields from the table: "subscription_plan_type" */
    subscription_plan_type_aggregate: ModelTypes["subscription_plan_type_aggregate"];
    /** fetch data from the table: "subscription_plan_type" using primary key columns */
    subscription_plan_type_by_pk?:
      | ModelTypes["subscription_plan_type"]
      | undefined;
    /** An array relationship */
    subscription_plans: Array<ModelTypes["subscription_plans"]>;
    /** An aggregate relationship */
    subscription_plans_aggregate: ModelTypes["subscription_plans_aggregate"];
    /** fetch data from the table: "subscription_plans" using primary key columns */
    subscription_plans_by_pk?: ModelTypes["subscription_plans"] | undefined;
    /** fetch data from the table: "subscriptions" */
    subscriptions: Array<ModelTypes["subscriptions"]>;
    /** fetch aggregated fields from the table: "subscriptions" */
    subscriptions_aggregate: ModelTypes["subscriptions_aggregate"];
    /** fetch data from the table: "subscriptions" using primary key columns */
    subscriptions_by_pk?: ModelTypes["subscriptions"] | undefined;
    /** fetch data from the table: "users" */
    users: Array<ModelTypes["users"]>;
    /** fetch aggregated fields from the table: "users" */
    users_aggregate: ModelTypes["users_aggregate"];
    /** fetch data from the table: "users" using primary key columns */
    users_by_pk?: ModelTypes["users"] | undefined;
  };
  /** columns and relationships of "slots" */
  ["slots"]: {
    from: ModelTypes["time"];
    id: number;
    to: ModelTypes["timetz"];
    type: ModelTypes["subscription_plan_frequency_enum"];
  };
  /** aggregated selection of "slots" */
  ["slots_aggregate"]: {
    aggregate?: ModelTypes["slots_aggregate_fields"] | undefined;
    nodes: Array<ModelTypes["slots"]>;
  };
  /** aggregate fields of "slots" */
  ["slots_aggregate_fields"]: {
    avg?: ModelTypes["slots_avg_fields"] | undefined;
    count: number;
    max?: ModelTypes["slots_max_fields"] | undefined;
    min?: ModelTypes["slots_min_fields"] | undefined;
    stddev?: ModelTypes["slots_stddev_fields"] | undefined;
    stddev_pop?: ModelTypes["slots_stddev_pop_fields"] | undefined;
    stddev_samp?: ModelTypes["slots_stddev_samp_fields"] | undefined;
    sum?: ModelTypes["slots_sum_fields"] | undefined;
    var_pop?: ModelTypes["slots_var_pop_fields"] | undefined;
    var_samp?: ModelTypes["slots_var_samp_fields"] | undefined;
    variance?: ModelTypes["slots_variance_fields"] | undefined;
  };
  /** aggregate avg on columns */
  ["slots_avg_fields"]: {
    id?: number | undefined;
  };
  /** Boolean expression to filter rows from the table "slots". All fields are combined with a logical 'AND'. */
  ["slots_bool_exp"]: {
    _and?: Array<ModelTypes["slots_bool_exp"]> | undefined;
    _not?: ModelTypes["slots_bool_exp"] | undefined;
    _or?: Array<ModelTypes["slots_bool_exp"]> | undefined;
    from?: ModelTypes["time_comparison_exp"] | undefined;
    id?: ModelTypes["Int_comparison_exp"] | undefined;
    to?: ModelTypes["timetz_comparison_exp"] | undefined;
    type?:
      | ModelTypes["subscription_plan_frequency_enum_comparison_exp"]
      | undefined;
  };
  ["slots_constraint"]: slots_constraint;
  /** input type for incrementing numeric columns in table "slots" */
  ["slots_inc_input"]: {
    id?: number | undefined;
  };
  /** input type for inserting data into table "slots" */
  ["slots_insert_input"]: {
    from?: ModelTypes["time"] | undefined;
    id?: number | undefined;
    to?: ModelTypes["timetz"] | undefined;
    type?: ModelTypes["subscription_plan_frequency_enum"] | undefined;
  };
  /** aggregate max on columns */
  ["slots_max_fields"]: {
    id?: number | undefined;
    to?: ModelTypes["timetz"] | undefined;
  };
  /** aggregate min on columns */
  ["slots_min_fields"]: {
    id?: number | undefined;
    to?: ModelTypes["timetz"] | undefined;
  };
  /** response of any mutation on the table "slots" */
  ["slots_mutation_response"]: {
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<ModelTypes["slots"]>;
  };
  /** on_conflict condition type for table "slots" */
  ["slots_on_conflict"]: {
    constraint: ModelTypes["slots_constraint"];
    update_columns: Array<ModelTypes["slots_update_column"]>;
    where?: ModelTypes["slots_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "slots". */
  ["slots_order_by"]: {
    from?: ModelTypes["order_by"] | undefined;
    id?: ModelTypes["order_by"] | undefined;
    to?: ModelTypes["order_by"] | undefined;
    type?: ModelTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: slots */
  ["slots_pk_columns_input"]: {
    id: number;
  };
  ["slots_select_column"]: slots_select_column;
  /** input type for updating data in table "slots" */
  ["slots_set_input"]: {
    from?: ModelTypes["time"] | undefined;
    id?: number | undefined;
    to?: ModelTypes["timetz"] | undefined;
    type?: ModelTypes["subscription_plan_frequency_enum"] | undefined;
  };
  /** aggregate stddev on columns */
  ["slots_stddev_fields"]: {
    id?: number | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["slots_stddev_pop_fields"]: {
    id?: number | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["slots_stddev_samp_fields"]: {
    id?: number | undefined;
  };
  /** Streaming cursor of the table "slots" */
  ["slots_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ModelTypes["slots_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ModelTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["slots_stream_cursor_value_input"]: {
    from?: ModelTypes["time"] | undefined;
    id?: number | undefined;
    to?: ModelTypes["timetz"] | undefined;
    type?: ModelTypes["subscription_plan_frequency_enum"] | undefined;
  };
  /** aggregate sum on columns */
  ["slots_sum_fields"]: {
    id?: number | undefined;
  };
  ["slots_update_column"]: slots_update_column;
  ["slots_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: ModelTypes["slots_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: ModelTypes["slots_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: ModelTypes["slots_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["slots_var_pop_fields"]: {
    id?: number | undefined;
  };
  /** aggregate var_samp on columns */
  ["slots_var_samp_fields"]: {
    id?: number | undefined;
  };
  /** aggregate variance on columns */
  ["slots_variance_fields"]: {
    id?: number | undefined;
  };
  /** columns and relationships of "subscription_plan_frequency" */
  ["subscription_plan_frequency"]: {
    /** An array relationship */
    subscription_plans: Array<ModelTypes["subscription_plans"]>;
    /** An aggregate relationship */
    subscription_plans_aggregate: ModelTypes["subscription_plans_aggregate"];
    value: string;
  };
  /** aggregated selection of "subscription_plan_frequency" */
  ["subscription_plan_frequency_aggregate"]: {
    aggregate?:
      | ModelTypes["subscription_plan_frequency_aggregate_fields"]
      | undefined;
    nodes: Array<ModelTypes["subscription_plan_frequency"]>;
  };
  /** aggregate fields of "subscription_plan_frequency" */
  ["subscription_plan_frequency_aggregate_fields"]: {
    count: number;
    max?: ModelTypes["subscription_plan_frequency_max_fields"] | undefined;
    min?: ModelTypes["subscription_plan_frequency_min_fields"] | undefined;
  };
  /** Boolean expression to filter rows from the table "subscription_plan_frequency". All fields are combined with a logical 'AND'. */
  ["subscription_plan_frequency_bool_exp"]: {
    _and?:
      | Array<ModelTypes["subscription_plan_frequency_bool_exp"]>
      | undefined;
    _not?: ModelTypes["subscription_plan_frequency_bool_exp"] | undefined;
    _or?: Array<ModelTypes["subscription_plan_frequency_bool_exp"]> | undefined;
    subscription_plans?: ModelTypes["subscription_plans_bool_exp"] | undefined;
    subscription_plans_aggregate?:
      | ModelTypes["subscription_plans_aggregate_bool_exp"]
      | undefined;
    value?: ModelTypes["String_comparison_exp"] | undefined;
  };
  ["subscription_plan_frequency_constraint"]: subscription_plan_frequency_constraint;
  ["subscription_plan_frequency_enum"]: subscription_plan_frequency_enum;
  /** Boolean expression to compare columns of type "subscription_plan_frequency_enum". All fields are combined with logical 'AND'. */
  ["subscription_plan_frequency_enum_comparison_exp"]: {
    _eq?: ModelTypes["subscription_plan_frequency_enum"] | undefined;
    _in?: Array<ModelTypes["subscription_plan_frequency_enum"]> | undefined;
    _is_null?: boolean | undefined;
    _neq?: ModelTypes["subscription_plan_frequency_enum"] | undefined;
    _nin?: Array<ModelTypes["subscription_plan_frequency_enum"]> | undefined;
  };
  /** input type for inserting data into table "subscription_plan_frequency" */
  ["subscription_plan_frequency_insert_input"]: {
    subscription_plans?:
      | ModelTypes["subscription_plans_arr_rel_insert_input"]
      | undefined;
    value?: string | undefined;
  };
  /** aggregate max on columns */
  ["subscription_plan_frequency_max_fields"]: {
    value?: string | undefined;
  };
  /** aggregate min on columns */
  ["subscription_plan_frequency_min_fields"]: {
    value?: string | undefined;
  };
  /** response of any mutation on the table "subscription_plan_frequency" */
  ["subscription_plan_frequency_mutation_response"]: {
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<ModelTypes["subscription_plan_frequency"]>;
  };
  /** input type for inserting object relation for remote table "subscription_plan_frequency" */
  ["subscription_plan_frequency_obj_rel_insert_input"]: {
    data: ModelTypes["subscription_plan_frequency_insert_input"];
    /** upsert condition */
    on_conflict?:
      | ModelTypes["subscription_plan_frequency_on_conflict"]
      | undefined;
  };
  /** on_conflict condition type for table "subscription_plan_frequency" */
  ["subscription_plan_frequency_on_conflict"]: {
    constraint: ModelTypes["subscription_plan_frequency_constraint"];
    update_columns: Array<
      ModelTypes["subscription_plan_frequency_update_column"]
    >;
    where?: ModelTypes["subscription_plan_frequency_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "subscription_plan_frequency". */
  ["subscription_plan_frequency_order_by"]: {
    subscription_plans_aggregate?:
      | ModelTypes["subscription_plans_aggregate_order_by"]
      | undefined;
    value?: ModelTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: subscription_plan_frequency */
  ["subscription_plan_frequency_pk_columns_input"]: {
    value: string;
  };
  ["subscription_plan_frequency_select_column"]: subscription_plan_frequency_select_column;
  /** input type for updating data in table "subscription_plan_frequency" */
  ["subscription_plan_frequency_set_input"]: {
    value?: string | undefined;
  };
  /** Streaming cursor of the table "subscription_plan_frequency" */
  ["subscription_plan_frequency_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ModelTypes["subscription_plan_frequency_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ModelTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plan_frequency_stream_cursor_value_input"]: {
    value?: string | undefined;
  };
  ["subscription_plan_frequency_update_column"]: subscription_plan_frequency_update_column;
  ["subscription_plan_frequency_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?: ModelTypes["subscription_plan_frequency_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: ModelTypes["subscription_plan_frequency_bool_exp"];
  };
  /** columns and relationships of "subscription_plan_type" */
  ["subscription_plan_type"]: {
    /** An array relationship */
    subscription_plans: Array<ModelTypes["subscription_plans"]>;
    /** An aggregate relationship */
    subscription_plans_aggregate: ModelTypes["subscription_plans_aggregate"];
    value: string;
  };
  /** aggregated selection of "subscription_plan_type" */
  ["subscription_plan_type_aggregate"]: {
    aggregate?:
      | ModelTypes["subscription_plan_type_aggregate_fields"]
      | undefined;
    nodes: Array<ModelTypes["subscription_plan_type"]>;
  };
  /** aggregate fields of "subscription_plan_type" */
  ["subscription_plan_type_aggregate_fields"]: {
    count: number;
    max?: ModelTypes["subscription_plan_type_max_fields"] | undefined;
    min?: ModelTypes["subscription_plan_type_min_fields"] | undefined;
  };
  /** Boolean expression to filter rows from the table "subscription_plan_type". All fields are combined with a logical 'AND'. */
  ["subscription_plan_type_bool_exp"]: {
    _and?: Array<ModelTypes["subscription_plan_type_bool_exp"]> | undefined;
    _not?: ModelTypes["subscription_plan_type_bool_exp"] | undefined;
    _or?: Array<ModelTypes["subscription_plan_type_bool_exp"]> | undefined;
    subscription_plans?: ModelTypes["subscription_plans_bool_exp"] | undefined;
    subscription_plans_aggregate?:
      | ModelTypes["subscription_plans_aggregate_bool_exp"]
      | undefined;
    value?: ModelTypes["String_comparison_exp"] | undefined;
  };
  ["subscription_plan_type_constraint"]: subscription_plan_type_constraint;
  ["subscription_plan_type_enum"]: subscription_plan_type_enum;
  /** Boolean expression to compare columns of type "subscription_plan_type_enum". All fields are combined with logical 'AND'. */
  ["subscription_plan_type_enum_comparison_exp"]: {
    _eq?: ModelTypes["subscription_plan_type_enum"] | undefined;
    _in?: Array<ModelTypes["subscription_plan_type_enum"]> | undefined;
    _is_null?: boolean | undefined;
    _neq?: ModelTypes["subscription_plan_type_enum"] | undefined;
    _nin?: Array<ModelTypes["subscription_plan_type_enum"]> | undefined;
  };
  /** input type for inserting data into table "subscription_plan_type" */
  ["subscription_plan_type_insert_input"]: {
    subscription_plans?:
      | ModelTypes["subscription_plans_arr_rel_insert_input"]
      | undefined;
    value?: string | undefined;
  };
  /** aggregate max on columns */
  ["subscription_plan_type_max_fields"]: {
    value?: string | undefined;
  };
  /** aggregate min on columns */
  ["subscription_plan_type_min_fields"]: {
    value?: string | undefined;
  };
  /** response of any mutation on the table "subscription_plan_type" */
  ["subscription_plan_type_mutation_response"]: {
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<ModelTypes["subscription_plan_type"]>;
  };
  /** input type for inserting object relation for remote table "subscription_plan_type" */
  ["subscription_plan_type_obj_rel_insert_input"]: {
    data: ModelTypes["subscription_plan_type_insert_input"];
    /** upsert condition */
    on_conflict?: ModelTypes["subscription_plan_type_on_conflict"] | undefined;
  };
  /** on_conflict condition type for table "subscription_plan_type" */
  ["subscription_plan_type_on_conflict"]: {
    constraint: ModelTypes["subscription_plan_type_constraint"];
    update_columns: Array<ModelTypes["subscription_plan_type_update_column"]>;
    where?: ModelTypes["subscription_plan_type_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "subscription_plan_type". */
  ["subscription_plan_type_order_by"]: {
    subscription_plans_aggregate?:
      | ModelTypes["subscription_plans_aggregate_order_by"]
      | undefined;
    value?: ModelTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: subscription_plan_type */
  ["subscription_plan_type_pk_columns_input"]: {
    value: string;
  };
  ["subscription_plan_type_select_column"]: subscription_plan_type_select_column;
  /** input type for updating data in table "subscription_plan_type" */
  ["subscription_plan_type_set_input"]: {
    value?: string | undefined;
  };
  /** Streaming cursor of the table "subscription_plan_type" */
  ["subscription_plan_type_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ModelTypes["subscription_plan_type_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ModelTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plan_type_stream_cursor_value_input"]: {
    value?: string | undefined;
  };
  ["subscription_plan_type_update_column"]: subscription_plan_type_update_column;
  ["subscription_plan_type_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?: ModelTypes["subscription_plan_type_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: ModelTypes["subscription_plan_type_bool_exp"];
  };
  /** columns and relationships of "subscription_plans" */
  ["subscription_plans"]: {
    frequency: ModelTypes["subscription_plan_frequency_enum"];
    id: number;
    is_non_veg: boolean;
    price: string;
    /** An object relationship */
    subscription_plan_frequency: ModelTypes["subscription_plan_frequency"];
    /** An object relationship */
    subscription_plan_type: ModelTypes["subscription_plan_type"];
    type: ModelTypes["subscription_plan_type_enum"];
  };
  /** aggregated selection of "subscription_plans" */
  ["subscription_plans_aggregate"]: {
    aggregate?: ModelTypes["subscription_plans_aggregate_fields"] | undefined;
    nodes: Array<ModelTypes["subscription_plans"]>;
  };
  ["subscription_plans_aggregate_bool_exp"]: {
    bool_and?:
      | ModelTypes["subscription_plans_aggregate_bool_exp_bool_and"]
      | undefined;
    bool_or?:
      | ModelTypes["subscription_plans_aggregate_bool_exp_bool_or"]
      | undefined;
    count?:
      | ModelTypes["subscription_plans_aggregate_bool_exp_count"]
      | undefined;
  };
  ["subscription_plans_aggregate_bool_exp_bool_and"]: {
    arguments: ModelTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"];
    distinct?: boolean | undefined;
    filter?: ModelTypes["subscription_plans_bool_exp"] | undefined;
    predicate: ModelTypes["Boolean_comparison_exp"];
  };
  ["subscription_plans_aggregate_bool_exp_bool_or"]: {
    arguments: ModelTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"];
    distinct?: boolean | undefined;
    filter?: ModelTypes["subscription_plans_bool_exp"] | undefined;
    predicate: ModelTypes["Boolean_comparison_exp"];
  };
  ["subscription_plans_aggregate_bool_exp_count"]: {
    arguments?:
      | Array<ModelTypes["subscription_plans_select_column"]>
      | undefined;
    distinct?: boolean | undefined;
    filter?: ModelTypes["subscription_plans_bool_exp"] | undefined;
    predicate: ModelTypes["Int_comparison_exp"];
  };
  /** aggregate fields of "subscription_plans" */
  ["subscription_plans_aggregate_fields"]: {
    avg?: ModelTypes["subscription_plans_avg_fields"] | undefined;
    count: number;
    max?: ModelTypes["subscription_plans_max_fields"] | undefined;
    min?: ModelTypes["subscription_plans_min_fields"] | undefined;
    stddev?: ModelTypes["subscription_plans_stddev_fields"] | undefined;
    stddev_pop?: ModelTypes["subscription_plans_stddev_pop_fields"] | undefined;
    stddev_samp?:
      | ModelTypes["subscription_plans_stddev_samp_fields"]
      | undefined;
    sum?: ModelTypes["subscription_plans_sum_fields"] | undefined;
    var_pop?: ModelTypes["subscription_plans_var_pop_fields"] | undefined;
    var_samp?: ModelTypes["subscription_plans_var_samp_fields"] | undefined;
    variance?: ModelTypes["subscription_plans_variance_fields"] | undefined;
  };
  /** order by aggregate values of table "subscription_plans" */
  ["subscription_plans_aggregate_order_by"]: {
    avg?: ModelTypes["subscription_plans_avg_order_by"] | undefined;
    count?: ModelTypes["order_by"] | undefined;
    max?: ModelTypes["subscription_plans_max_order_by"] | undefined;
    min?: ModelTypes["subscription_plans_min_order_by"] | undefined;
    stddev?: ModelTypes["subscription_plans_stddev_order_by"] | undefined;
    stddev_pop?:
      | ModelTypes["subscription_plans_stddev_pop_order_by"]
      | undefined;
    stddev_samp?:
      | ModelTypes["subscription_plans_stddev_samp_order_by"]
      | undefined;
    sum?: ModelTypes["subscription_plans_sum_order_by"] | undefined;
    var_pop?: ModelTypes["subscription_plans_var_pop_order_by"] | undefined;
    var_samp?: ModelTypes["subscription_plans_var_samp_order_by"] | undefined;
    variance?: ModelTypes["subscription_plans_variance_order_by"] | undefined;
  };
  /** input type for inserting array relation for remote table "subscription_plans" */
  ["subscription_plans_arr_rel_insert_input"]: {
    data: Array<ModelTypes["subscription_plans_insert_input"]>;
    /** upsert condition */
    on_conflict?: ModelTypes["subscription_plans_on_conflict"] | undefined;
  };
  /** aggregate avg on columns */
  ["subscription_plans_avg_fields"]: {
    id?: number | undefined;
  };
  /** order by avg() on columns of table "subscription_plans" */
  ["subscription_plans_avg_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
  };
  /** Boolean expression to filter rows from the table "subscription_plans". All fields are combined with a logical 'AND'. */
  ["subscription_plans_bool_exp"]: {
    _and?: Array<ModelTypes["subscription_plans_bool_exp"]> | undefined;
    _not?: ModelTypes["subscription_plans_bool_exp"] | undefined;
    _or?: Array<ModelTypes["subscription_plans_bool_exp"]> | undefined;
    frequency?:
      | ModelTypes["subscription_plan_frequency_enum_comparison_exp"]
      | undefined;
    id?: ModelTypes["Int_comparison_exp"] | undefined;
    is_non_veg?: ModelTypes["Boolean_comparison_exp"] | undefined;
    price?: ModelTypes["String_comparison_exp"] | undefined;
    subscription_plan_frequency?:
      | ModelTypes["subscription_plan_frequency_bool_exp"]
      | undefined;
    subscription_plan_type?:
      | ModelTypes["subscription_plan_type_bool_exp"]
      | undefined;
    type?: ModelTypes["subscription_plan_type_enum_comparison_exp"] | undefined;
  };
  ["subscription_plans_constraint"]: subscription_plans_constraint;
  /** input type for incrementing numeric columns in table "subscription_plans" */
  ["subscription_plans_inc_input"]: {
    id?: number | undefined;
  };
  /** input type for inserting data into table "subscription_plans" */
  ["subscription_plans_insert_input"]: {
    frequency?: ModelTypes["subscription_plan_frequency_enum"] | undefined;
    id?: number | undefined;
    is_non_veg?: boolean | undefined;
    price?: string | undefined;
    subscription_plan_frequency?:
      | ModelTypes["subscription_plan_frequency_obj_rel_insert_input"]
      | undefined;
    subscription_plan_type?:
      | ModelTypes["subscription_plan_type_obj_rel_insert_input"]
      | undefined;
    type?: ModelTypes["subscription_plan_type_enum"] | undefined;
  };
  /** aggregate max on columns */
  ["subscription_plans_max_fields"]: {
    id?: number | undefined;
    price?: string | undefined;
  };
  /** order by max() on columns of table "subscription_plans" */
  ["subscription_plans_max_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
    price?: ModelTypes["order_by"] | undefined;
  };
  /** aggregate min on columns */
  ["subscription_plans_min_fields"]: {
    id?: number | undefined;
    price?: string | undefined;
  };
  /** order by min() on columns of table "subscription_plans" */
  ["subscription_plans_min_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
    price?: ModelTypes["order_by"] | undefined;
  };
  /** response of any mutation on the table "subscription_plans" */
  ["subscription_plans_mutation_response"]: {
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<ModelTypes["subscription_plans"]>;
  };
  /** on_conflict condition type for table "subscription_plans" */
  ["subscription_plans_on_conflict"]: {
    constraint: ModelTypes["subscription_plans_constraint"];
    update_columns: Array<ModelTypes["subscription_plans_update_column"]>;
    where?: ModelTypes["subscription_plans_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "subscription_plans". */
  ["subscription_plans_order_by"]: {
    frequency?: ModelTypes["order_by"] | undefined;
    id?: ModelTypes["order_by"] | undefined;
    is_non_veg?: ModelTypes["order_by"] | undefined;
    price?: ModelTypes["order_by"] | undefined;
    subscription_plan_frequency?:
      | ModelTypes["subscription_plan_frequency_order_by"]
      | undefined;
    subscription_plan_type?:
      | ModelTypes["subscription_plan_type_order_by"]
      | undefined;
    type?: ModelTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: subscription_plans */
  ["subscription_plans_pk_columns_input"]: {
    id: number;
  };
  ["subscription_plans_select_column"]: subscription_plans_select_column;
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"]: subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns;
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"]: subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns;
  /** input type for updating data in table "subscription_plans" */
  ["subscription_plans_set_input"]: {
    frequency?: ModelTypes["subscription_plan_frequency_enum"] | undefined;
    id?: number | undefined;
    is_non_veg?: boolean | undefined;
    price?: string | undefined;
    type?: ModelTypes["subscription_plan_type_enum"] | undefined;
  };
  /** aggregate stddev on columns */
  ["subscription_plans_stddev_fields"]: {
    id?: number | undefined;
  };
  /** order by stddev() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["subscription_plans_stddev_pop_fields"]: {
    id?: number | undefined;
  };
  /** order by stddev_pop() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_pop_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["subscription_plans_stddev_samp_fields"]: {
    id?: number | undefined;
  };
  /** order by stddev_samp() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_samp_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
  };
  /** Streaming cursor of the table "subscription_plans" */
  ["subscription_plans_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ModelTypes["subscription_plans_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ModelTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plans_stream_cursor_value_input"]: {
    frequency?: ModelTypes["subscription_plan_frequency_enum"] | undefined;
    id?: number | undefined;
    is_non_veg?: boolean | undefined;
    price?: string | undefined;
    type?: ModelTypes["subscription_plan_type_enum"] | undefined;
  };
  /** aggregate sum on columns */
  ["subscription_plans_sum_fields"]: {
    id?: number | undefined;
  };
  /** order by sum() on columns of table "subscription_plans" */
  ["subscription_plans_sum_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
  };
  ["subscription_plans_update_column"]: subscription_plans_update_column;
  ["subscription_plans_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: ModelTypes["subscription_plans_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: ModelTypes["subscription_plans_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: ModelTypes["subscription_plans_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["subscription_plans_var_pop_fields"]: {
    id?: number | undefined;
  };
  /** order by var_pop() on columns of table "subscription_plans" */
  ["subscription_plans_var_pop_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
  };
  /** aggregate var_samp on columns */
  ["subscription_plans_var_samp_fields"]: {
    id?: number | undefined;
  };
  /** order by var_samp() on columns of table "subscription_plans" */
  ["subscription_plans_var_samp_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
  };
  /** aggregate variance on columns */
  ["subscription_plans_variance_fields"]: {
    id?: number | undefined;
  };
  /** order by variance() on columns of table "subscription_plans" */
  ["subscription_plans_variance_order_by"]: {
    id?: ModelTypes["order_by"] | undefined;
  };
  ["subscription_root"]: {
    /** fetch data from the table: "meals" */
    meals: Array<ModelTypes["meals"]>;
    /** fetch aggregated fields from the table: "meals" */
    meals_aggregate: ModelTypes["meals_aggregate"];
    /** fetch data from the table: "meals" using primary key columns */
    meals_by_pk?: ModelTypes["meals"] | undefined;
    /** fetch data from the table in a streaming manner: "meals" */
    meals_stream: Array<ModelTypes["meals"]>;
    /** fetch data from the table: "order_delivery_status" */
    order_delivery_status: Array<ModelTypes["order_delivery_status"]>;
    /** fetch aggregated fields from the table: "order_delivery_status" */
    order_delivery_status_aggregate: ModelTypes["order_delivery_status_aggregate"];
    /** fetch data from the table: "order_delivery_status" using primary key columns */
    order_delivery_status_by_pk?:
      | ModelTypes["order_delivery_status"]
      | undefined;
    /** fetch data from the table in a streaming manner: "order_delivery_status" */
    order_delivery_status_stream: Array<ModelTypes["order_delivery_status"]>;
    /** fetch data from the table: "orders" */
    orders: Array<ModelTypes["orders"]>;
    /** fetch aggregated fields from the table: "orders" */
    orders_aggregate: ModelTypes["orders_aggregate"];
    /** fetch data from the table: "orders" using primary key columns */
    orders_by_pk?: ModelTypes["orders"] | undefined;
    /** fetch data from the table in a streaming manner: "orders" */
    orders_stream: Array<ModelTypes["orders"]>;
    /** fetch data from the table: "slots" */
    slots: Array<ModelTypes["slots"]>;
    /** fetch aggregated fields from the table: "slots" */
    slots_aggregate: ModelTypes["slots_aggregate"];
    /** fetch data from the table: "slots" using primary key columns */
    slots_by_pk?: ModelTypes["slots"] | undefined;
    /** fetch data from the table in a streaming manner: "slots" */
    slots_stream: Array<ModelTypes["slots"]>;
    /** fetch data from the table: "subscription_plan_frequency" */
    subscription_plan_frequency: Array<
      ModelTypes["subscription_plan_frequency"]
    >;
    /** fetch aggregated fields from the table: "subscription_plan_frequency" */
    subscription_plan_frequency_aggregate: ModelTypes["subscription_plan_frequency_aggregate"];
    /** fetch data from the table: "subscription_plan_frequency" using primary key columns */
    subscription_plan_frequency_by_pk?:
      | ModelTypes["subscription_plan_frequency"]
      | undefined;
    /** fetch data from the table in a streaming manner: "subscription_plan_frequency" */
    subscription_plan_frequency_stream: Array<
      ModelTypes["subscription_plan_frequency"]
    >;
    /** fetch data from the table: "subscription_plan_type" */
    subscription_plan_type: Array<ModelTypes["subscription_plan_type"]>;
    /** fetch aggregated fields from the table: "subscription_plan_type" */
    subscription_plan_type_aggregate: ModelTypes["subscription_plan_type_aggregate"];
    /** fetch data from the table: "subscription_plan_type" using primary key columns */
    subscription_plan_type_by_pk?:
      | ModelTypes["subscription_plan_type"]
      | undefined;
    /** fetch data from the table in a streaming manner: "subscription_plan_type" */
    subscription_plan_type_stream: Array<ModelTypes["subscription_plan_type"]>;
    /** An array relationship */
    subscription_plans: Array<ModelTypes["subscription_plans"]>;
    /** An aggregate relationship */
    subscription_plans_aggregate: ModelTypes["subscription_plans_aggregate"];
    /** fetch data from the table: "subscription_plans" using primary key columns */
    subscription_plans_by_pk?: ModelTypes["subscription_plans"] | undefined;
    /** fetch data from the table in a streaming manner: "subscription_plans" */
    subscription_plans_stream: Array<ModelTypes["subscription_plans"]>;
    /** fetch data from the table: "subscriptions" */
    subscriptions: Array<ModelTypes["subscriptions"]>;
    /** fetch aggregated fields from the table: "subscriptions" */
    subscriptions_aggregate: ModelTypes["subscriptions_aggregate"];
    /** fetch data from the table: "subscriptions" using primary key columns */
    subscriptions_by_pk?: ModelTypes["subscriptions"] | undefined;
    /** fetch data from the table in a streaming manner: "subscriptions" */
    subscriptions_stream: Array<ModelTypes["subscriptions"]>;
    /** fetch data from the table: "users" */
    users: Array<ModelTypes["users"]>;
    /** fetch aggregated fields from the table: "users" */
    users_aggregate: ModelTypes["users_aggregate"];
    /** fetch data from the table: "users" using primary key columns */
    users_by_pk?: ModelTypes["users"] | undefined;
    /** fetch data from the table in a streaming manner: "users" */
    users_stream: Array<ModelTypes["users"]>;
  };
  /** columns and relationships of "subscriptions" */
  ["subscriptions"]: {
    assigned_chef?: ModelTypes["uuid"] | undefined;
    created_at: ModelTypes["timestamptz"];
    end_date: ModelTypes["date"];
    id: ModelTypes["uuid"];
    slot_id?: number | undefined;
    start_date: ModelTypes["date"];
    subscription_plan_id: number;
    updated_at: ModelTypes["timestamptz"];
    user_id: ModelTypes["uuid"];
  };
  /** aggregated selection of "subscriptions" */
  ["subscriptions_aggregate"]: {
    aggregate?: ModelTypes["subscriptions_aggregate_fields"] | undefined;
    nodes: Array<ModelTypes["subscriptions"]>;
  };
  /** aggregate fields of "subscriptions" */
  ["subscriptions_aggregate_fields"]: {
    avg?: ModelTypes["subscriptions_avg_fields"] | undefined;
    count: number;
    max?: ModelTypes["subscriptions_max_fields"] | undefined;
    min?: ModelTypes["subscriptions_min_fields"] | undefined;
    stddev?: ModelTypes["subscriptions_stddev_fields"] | undefined;
    stddev_pop?: ModelTypes["subscriptions_stddev_pop_fields"] | undefined;
    stddev_samp?: ModelTypes["subscriptions_stddev_samp_fields"] | undefined;
    sum?: ModelTypes["subscriptions_sum_fields"] | undefined;
    var_pop?: ModelTypes["subscriptions_var_pop_fields"] | undefined;
    var_samp?: ModelTypes["subscriptions_var_samp_fields"] | undefined;
    variance?: ModelTypes["subscriptions_variance_fields"] | undefined;
  };
  /** aggregate avg on columns */
  ["subscriptions_avg_fields"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** Boolean expression to filter rows from the table "subscriptions". All fields are combined with a logical 'AND'. */
  ["subscriptions_bool_exp"]: {
    _and?: Array<ModelTypes["subscriptions_bool_exp"]> | undefined;
    _not?: ModelTypes["subscriptions_bool_exp"] | undefined;
    _or?: Array<ModelTypes["subscriptions_bool_exp"]> | undefined;
    assigned_chef?: ModelTypes["uuid_comparison_exp"] | undefined;
    created_at?: ModelTypes["timestamptz_comparison_exp"] | undefined;
    end_date?: ModelTypes["date_comparison_exp"] | undefined;
    id?: ModelTypes["uuid_comparison_exp"] | undefined;
    slot_id?: ModelTypes["Int_comparison_exp"] | undefined;
    start_date?: ModelTypes["date_comparison_exp"] | undefined;
    subscription_plan_id?: ModelTypes["Int_comparison_exp"] | undefined;
    updated_at?: ModelTypes["timestamptz_comparison_exp"] | undefined;
    user_id?: ModelTypes["uuid_comparison_exp"] | undefined;
  };
  ["subscriptions_constraint"]: subscriptions_constraint;
  /** input type for incrementing numeric columns in table "subscriptions" */
  ["subscriptions_inc_input"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** input type for inserting data into table "subscriptions" */
  ["subscriptions_insert_input"]: {
    assigned_chef?: ModelTypes["uuid"] | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    end_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: ModelTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    user_id?: ModelTypes["uuid"] | undefined;
  };
  /** aggregate max on columns */
  ["subscriptions_max_fields"]: {
    assigned_chef?: ModelTypes["uuid"] | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    end_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: ModelTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    user_id?: ModelTypes["uuid"] | undefined;
  };
  /** aggregate min on columns */
  ["subscriptions_min_fields"]: {
    assigned_chef?: ModelTypes["uuid"] | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    end_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: ModelTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    user_id?: ModelTypes["uuid"] | undefined;
  };
  /** response of any mutation on the table "subscriptions" */
  ["subscriptions_mutation_response"]: {
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<ModelTypes["subscriptions"]>;
  };
  /** on_conflict condition type for table "subscriptions" */
  ["subscriptions_on_conflict"]: {
    constraint: ModelTypes["subscriptions_constraint"];
    update_columns: Array<ModelTypes["subscriptions_update_column"]>;
    where?: ModelTypes["subscriptions_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "subscriptions". */
  ["subscriptions_order_by"]: {
    assigned_chef?: ModelTypes["order_by"] | undefined;
    created_at?: ModelTypes["order_by"] | undefined;
    end_date?: ModelTypes["order_by"] | undefined;
    id?: ModelTypes["order_by"] | undefined;
    slot_id?: ModelTypes["order_by"] | undefined;
    start_date?: ModelTypes["order_by"] | undefined;
    subscription_plan_id?: ModelTypes["order_by"] | undefined;
    updated_at?: ModelTypes["order_by"] | undefined;
    user_id?: ModelTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: subscriptions */
  ["subscriptions_pk_columns_input"]: {
    id: ModelTypes["uuid"];
  };
  ["subscriptions_select_column"]: subscriptions_select_column;
  /** input type for updating data in table "subscriptions" */
  ["subscriptions_set_input"]: {
    assigned_chef?: ModelTypes["uuid"] | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    end_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: ModelTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    user_id?: ModelTypes["uuid"] | undefined;
  };
  /** aggregate stddev on columns */
  ["subscriptions_stddev_fields"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["subscriptions_stddev_pop_fields"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["subscriptions_stddev_samp_fields"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** Streaming cursor of the table "subscriptions" */
  ["subscriptions_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ModelTypes["subscriptions_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ModelTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscriptions_stream_cursor_value_input"]: {
    assigned_chef?: ModelTypes["uuid"] | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    end_date?: ModelTypes["date"] | undefined;
    id?: ModelTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: ModelTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    user_id?: ModelTypes["uuid"] | undefined;
  };
  /** aggregate sum on columns */
  ["subscriptions_sum_fields"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  ["subscriptions_update_column"]: subscriptions_update_column;
  ["subscriptions_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: ModelTypes["subscriptions_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: ModelTypes["subscriptions_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: ModelTypes["subscriptions_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["subscriptions_var_pop_fields"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** aggregate var_samp on columns */
  ["subscriptions_var_samp_fields"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** aggregate variance on columns */
  ["subscriptions_variance_fields"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  ["time"]: any;
  /** Boolean expression to compare columns of type "time". All fields are combined with logical 'AND'. */
  ["time_comparison_exp"]: {
    _eq?: ModelTypes["time"] | undefined;
    _gt?: ModelTypes["time"] | undefined;
    _gte?: ModelTypes["time"] | undefined;
    _in?: Array<ModelTypes["time"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: ModelTypes["time"] | undefined;
    _lte?: ModelTypes["time"] | undefined;
    _neq?: ModelTypes["time"] | undefined;
    _nin?: Array<ModelTypes["time"]> | undefined;
  };
  ["timestamptz"]: any;
  /** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
  ["timestamptz_comparison_exp"]: {
    _eq?: ModelTypes["timestamptz"] | undefined;
    _gt?: ModelTypes["timestamptz"] | undefined;
    _gte?: ModelTypes["timestamptz"] | undefined;
    _in?: Array<ModelTypes["timestamptz"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: ModelTypes["timestamptz"] | undefined;
    _lte?: ModelTypes["timestamptz"] | undefined;
    _neq?: ModelTypes["timestamptz"] | undefined;
    _nin?: Array<ModelTypes["timestamptz"]> | undefined;
  };
  ["timetz"]: any;
  /** Boolean expression to compare columns of type "timetz". All fields are combined with logical 'AND'. */
  ["timetz_comparison_exp"]: {
    _eq?: ModelTypes["timetz"] | undefined;
    _gt?: ModelTypes["timetz"] | undefined;
    _gte?: ModelTypes["timetz"] | undefined;
    _in?: Array<ModelTypes["timetz"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: ModelTypes["timetz"] | undefined;
    _lte?: ModelTypes["timetz"] | undefined;
    _neq?: ModelTypes["timetz"] | undefined;
    _nin?: Array<ModelTypes["timetz"]> | undefined;
  };
  /** columns and relationships of "users" */
  ["users"]: {
    address_city: string;
    address_line_1: string;
    address_line_2: string;
    address_pincode: string;
    address_state: string;
    created_at: ModelTypes["timestamptz"];
    email: string;
    id: ModelTypes["uuid"];
    is_chef: boolean;
    phone: string;
    updated_at: ModelTypes["timestamptz"];
    whatsapp: string;
  };
  /** aggregated selection of "users" */
  ["users_aggregate"]: {
    aggregate?: ModelTypes["users_aggregate_fields"] | undefined;
    nodes: Array<ModelTypes["users"]>;
  };
  /** aggregate fields of "users" */
  ["users_aggregate_fields"]: {
    count: number;
    max?: ModelTypes["users_max_fields"] | undefined;
    min?: ModelTypes["users_min_fields"] | undefined;
  };
  /** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
  ["users_bool_exp"]: {
    _and?: Array<ModelTypes["users_bool_exp"]> | undefined;
    _not?: ModelTypes["users_bool_exp"] | undefined;
    _or?: Array<ModelTypes["users_bool_exp"]> | undefined;
    address_city?: ModelTypes["String_comparison_exp"] | undefined;
    address_line_1?: ModelTypes["String_comparison_exp"] | undefined;
    address_line_2?: ModelTypes["String_comparison_exp"] | undefined;
    address_pincode?: ModelTypes["String_comparison_exp"] | undefined;
    address_state?: ModelTypes["String_comparison_exp"] | undefined;
    created_at?: ModelTypes["timestamptz_comparison_exp"] | undefined;
    email?: ModelTypes["String_comparison_exp"] | undefined;
    id?: ModelTypes["uuid_comparison_exp"] | undefined;
    is_chef?: ModelTypes["Boolean_comparison_exp"] | undefined;
    phone?: ModelTypes["String_comparison_exp"] | undefined;
    updated_at?: ModelTypes["timestamptz_comparison_exp"] | undefined;
    whatsapp?: ModelTypes["String_comparison_exp"] | undefined;
  };
  ["users_constraint"]: users_constraint;
  /** input type for inserting data into table "users" */
  ["users_insert_input"]: {
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: ModelTypes["uuid"] | undefined;
    is_chef?: boolean | undefined;
    phone?: string | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  /** aggregate max on columns */
  ["users_max_fields"]: {
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: ModelTypes["uuid"] | undefined;
    phone?: string | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  /** aggregate min on columns */
  ["users_min_fields"]: {
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: ModelTypes["uuid"] | undefined;
    phone?: string | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  /** response of any mutation on the table "users" */
  ["users_mutation_response"]: {
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<ModelTypes["users"]>;
  };
  /** on_conflict condition type for table "users" */
  ["users_on_conflict"]: {
    constraint: ModelTypes["users_constraint"];
    update_columns: Array<ModelTypes["users_update_column"]>;
    where?: ModelTypes["users_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "users". */
  ["users_order_by"]: {
    address_city?: ModelTypes["order_by"] | undefined;
    address_line_1?: ModelTypes["order_by"] | undefined;
    address_line_2?: ModelTypes["order_by"] | undefined;
    address_pincode?: ModelTypes["order_by"] | undefined;
    address_state?: ModelTypes["order_by"] | undefined;
    created_at?: ModelTypes["order_by"] | undefined;
    email?: ModelTypes["order_by"] | undefined;
    id?: ModelTypes["order_by"] | undefined;
    is_chef?: ModelTypes["order_by"] | undefined;
    phone?: ModelTypes["order_by"] | undefined;
    updated_at?: ModelTypes["order_by"] | undefined;
    whatsapp?: ModelTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: users */
  ["users_pk_columns_input"]: {
    id: ModelTypes["uuid"];
  };
  ["users_select_column"]: users_select_column;
  /** input type for updating data in table "users" */
  ["users_set_input"]: {
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: ModelTypes["uuid"] | undefined;
    is_chef?: boolean | undefined;
    phone?: string | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  /** Streaming cursor of the table "users" */
  ["users_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: ModelTypes["users_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: ModelTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["users_stream_cursor_value_input"]: {
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: ModelTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: ModelTypes["uuid"] | undefined;
    is_chef?: boolean | undefined;
    phone?: string | undefined;
    updated_at?: ModelTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  ["users_update_column"]: users_update_column;
  ["users_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?: ModelTypes["users_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: ModelTypes["users_bool_exp"];
  };
  ["uuid"]: any;
  /** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
  ["uuid_comparison_exp"]: {
    _eq?: ModelTypes["uuid"] | undefined;
    _gt?: ModelTypes["uuid"] | undefined;
    _gte?: ModelTypes["uuid"] | undefined;
    _in?: Array<ModelTypes["uuid"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: ModelTypes["uuid"] | undefined;
    _lte?: ModelTypes["uuid"] | undefined;
    _neq?: ModelTypes["uuid"] | undefined;
    _nin?: Array<ModelTypes["uuid"]> | undefined;
  };
};

export type GraphQLTypes = {
  /** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
  ["Boolean_comparison_exp"]: {
    _eq?: boolean | undefined;
    _gt?: boolean | undefined;
    _gte?: boolean | undefined;
    _in?: Array<boolean> | undefined;
    _is_null?: boolean | undefined;
    _lt?: boolean | undefined;
    _lte?: boolean | undefined;
    _neq?: boolean | undefined;
    _nin?: Array<boolean> | undefined;
  };
  /** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
  ["Int_comparison_exp"]: {
    _eq?: number | undefined;
    _gt?: number | undefined;
    _gte?: number | undefined;
    _in?: Array<number> | undefined;
    _is_null?: boolean | undefined;
    _lt?: number | undefined;
    _lte?: number | undefined;
    _neq?: number | undefined;
    _nin?: Array<number> | undefined;
  };
  /** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
  ["String_comparison_exp"]: {
    _eq?: string | undefined;
    _gt?: string | undefined;
    _gte?: string | undefined;
    /** does the column match the given case-insensitive pattern */
    _ilike?: string | undefined;
    _in?: Array<string> | undefined;
    /** does the column match the given POSIX regular expression, case insensitive */
    _iregex?: string | undefined;
    _is_null?: boolean | undefined;
    /** does the column match the given pattern */
    _like?: string | undefined;
    _lt?: string | undefined;
    _lte?: string | undefined;
    _neq?: string | undefined;
    /** does the column NOT match the given case-insensitive pattern */
    _nilike?: string | undefined;
    _nin?: Array<string> | undefined;
    /** does the column NOT match the given POSIX regular expression, case insensitive */
    _niregex?: string | undefined;
    /** does the column NOT match the given pattern */
    _nlike?: string | undefined;
    /** does the column NOT match the given POSIX regular expression, case sensitive */
    _nregex?: string | undefined;
    /** does the column NOT match the given SQL regular expression */
    _nsimilar?: string | undefined;
    /** does the column match the given POSIX regular expression, case sensitive */
    _regex?: string | undefined;
    /** does the column match the given SQL regular expression */
    _similar?: string | undefined;
  };
  /** ordering argument of a cursor */
  ["cursor_ordering"]: cursor_ordering;
  ["date"]: "scalar" & { name: "date" };
  /** Boolean expression to compare columns of type "date". All fields are combined with logical 'AND'. */
  ["date_comparison_exp"]: {
    _eq?: GraphQLTypes["date"] | undefined;
    _gt?: GraphQLTypes["date"] | undefined;
    _gte?: GraphQLTypes["date"] | undefined;
    _in?: Array<GraphQLTypes["date"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: GraphQLTypes["date"] | undefined;
    _lte?: GraphQLTypes["date"] | undefined;
    _neq?: GraphQLTypes["date"] | undefined;
    _nin?: Array<GraphQLTypes["date"]> | undefined;
  };
  /** columns and relationships of "meals" */
  ["meals"]: {
    __typename: "meals";
    id: number;
    name: string;
    type: string;
  };
  /** aggregated selection of "meals" */
  ["meals_aggregate"]: {
    __typename: "meals_aggregate";
    aggregate?: GraphQLTypes["meals_aggregate_fields"] | undefined;
    nodes: Array<GraphQLTypes["meals"]>;
  };
  /** aggregate fields of "meals" */
  ["meals_aggregate_fields"]: {
    __typename: "meals_aggregate_fields";
    avg?: GraphQLTypes["meals_avg_fields"] | undefined;
    count: number;
    max?: GraphQLTypes["meals_max_fields"] | undefined;
    min?: GraphQLTypes["meals_min_fields"] | undefined;
    stddev?: GraphQLTypes["meals_stddev_fields"] | undefined;
    stddev_pop?: GraphQLTypes["meals_stddev_pop_fields"] | undefined;
    stddev_samp?: GraphQLTypes["meals_stddev_samp_fields"] | undefined;
    sum?: GraphQLTypes["meals_sum_fields"] | undefined;
    var_pop?: GraphQLTypes["meals_var_pop_fields"] | undefined;
    var_samp?: GraphQLTypes["meals_var_samp_fields"] | undefined;
    variance?: GraphQLTypes["meals_variance_fields"] | undefined;
  };
  /** aggregate avg on columns */
  ["meals_avg_fields"]: {
    __typename: "meals_avg_fields";
    id?: number | undefined;
  };
  /** Boolean expression to filter rows from the table "meals". All fields are combined with a logical 'AND'. */
  ["meals_bool_exp"]: {
    _and?: Array<GraphQLTypes["meals_bool_exp"]> | undefined;
    _not?: GraphQLTypes["meals_bool_exp"] | undefined;
    _or?: Array<GraphQLTypes["meals_bool_exp"]> | undefined;
    id?: GraphQLTypes["Int_comparison_exp"] | undefined;
    name?: GraphQLTypes["String_comparison_exp"] | undefined;
    type?: GraphQLTypes["String_comparison_exp"] | undefined;
  };
  /** unique or primary key constraints on table "meals" */
  ["meals_constraint"]: meals_constraint;
  /** input type for incrementing numeric columns in table "meals" */
  ["meals_inc_input"]: {
    id?: number | undefined;
  };
  /** input type for inserting data into table "meals" */
  ["meals_insert_input"]: {
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** aggregate max on columns */
  ["meals_max_fields"]: {
    __typename: "meals_max_fields";
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** aggregate min on columns */
  ["meals_min_fields"]: {
    __typename: "meals_min_fields";
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** response of any mutation on the table "meals" */
  ["meals_mutation_response"]: {
    __typename: "meals_mutation_response";
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<GraphQLTypes["meals"]>;
  };
  /** on_conflict condition type for table "meals" */
  ["meals_on_conflict"]: {
    constraint: GraphQLTypes["meals_constraint"];
    update_columns: Array<GraphQLTypes["meals_update_column"]>;
    where?: GraphQLTypes["meals_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "meals". */
  ["meals_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
    name?: GraphQLTypes["order_by"] | undefined;
    type?: GraphQLTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: meals */
  ["meals_pk_columns_input"]: {
    id: number;
  };
  /** select columns of table "meals" */
  ["meals_select_column"]: meals_select_column;
  /** input type for updating data in table "meals" */
  ["meals_set_input"]: {
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** aggregate stddev on columns */
  ["meals_stddev_fields"]: {
    __typename: "meals_stddev_fields";
    id?: number | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["meals_stddev_pop_fields"]: {
    __typename: "meals_stddev_pop_fields";
    id?: number | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["meals_stddev_samp_fields"]: {
    __typename: "meals_stddev_samp_fields";
    id?: number | undefined;
  };
  /** Streaming cursor of the table "meals" */
  ["meals_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: GraphQLTypes["meals_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: GraphQLTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["meals_stream_cursor_value_input"]: {
    id?: number | undefined;
    name?: string | undefined;
    type?: string | undefined;
  };
  /** aggregate sum on columns */
  ["meals_sum_fields"]: {
    __typename: "meals_sum_fields";
    id?: number | undefined;
  };
  /** update columns of table "meals" */
  ["meals_update_column"]: meals_update_column;
  ["meals_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: GraphQLTypes["meals_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: GraphQLTypes["meals_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: GraphQLTypes["meals_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["meals_var_pop_fields"]: {
    __typename: "meals_var_pop_fields";
    id?: number | undefined;
  };
  /** aggregate var_samp on columns */
  ["meals_var_samp_fields"]: {
    __typename: "meals_var_samp_fields";
    id?: number | undefined;
  };
  /** aggregate variance on columns */
  ["meals_variance_fields"]: {
    __typename: "meals_variance_fields";
    id?: number | undefined;
  };
  /** mutation root */
  ["mutation_root"]: {
    __typename: "mutation_root";
    /** delete data from the table: "meals" */
    delete_meals?: GraphQLTypes["meals_mutation_response"] | undefined;
    /** delete single row from the table: "meals" */
    delete_meals_by_pk?: GraphQLTypes["meals"] | undefined;
    /** delete data from the table: "order_delivery_status" */
    delete_order_delivery_status?:
      | GraphQLTypes["order_delivery_status_mutation_response"]
      | undefined;
    /** delete single row from the table: "order_delivery_status" */
    delete_order_delivery_status_by_pk?:
      | GraphQLTypes["order_delivery_status"]
      | undefined;
    /** delete data from the table: "orders" */
    delete_orders?: GraphQLTypes["orders_mutation_response"] | undefined;
    /** delete single row from the table: "orders" */
    delete_orders_by_pk?: GraphQLTypes["orders"] | undefined;
    /** delete data from the table: "slots" */
    delete_slots?: GraphQLTypes["slots_mutation_response"] | undefined;
    /** delete single row from the table: "slots" */
    delete_slots_by_pk?: GraphQLTypes["slots"] | undefined;
    /** delete data from the table: "subscription_plan_frequency" */
    delete_subscription_plan_frequency?:
      | GraphQLTypes["subscription_plan_frequency_mutation_response"]
      | undefined;
    /** delete single row from the table: "subscription_plan_frequency" */
    delete_subscription_plan_frequency_by_pk?:
      | GraphQLTypes["subscription_plan_frequency"]
      | undefined;
    /** delete data from the table: "subscription_plan_type" */
    delete_subscription_plan_type?:
      | GraphQLTypes["subscription_plan_type_mutation_response"]
      | undefined;
    /** delete single row from the table: "subscription_plan_type" */
    delete_subscription_plan_type_by_pk?:
      | GraphQLTypes["subscription_plan_type"]
      | undefined;
    /** delete data from the table: "subscription_plans" */
    delete_subscription_plans?:
      | GraphQLTypes["subscription_plans_mutation_response"]
      | undefined;
    /** delete single row from the table: "subscription_plans" */
    delete_subscription_plans_by_pk?:
      | GraphQLTypes["subscription_plans"]
      | undefined;
    /** delete data from the table: "subscriptions" */
    delete_subscriptions?:
      | GraphQLTypes["subscriptions_mutation_response"]
      | undefined;
    /** delete single row from the table: "subscriptions" */
    delete_subscriptions_by_pk?: GraphQLTypes["subscriptions"] | undefined;
    /** delete data from the table: "users" */
    delete_users?: GraphQLTypes["users_mutation_response"] | undefined;
    /** delete single row from the table: "users" */
    delete_users_by_pk?: GraphQLTypes["users"] | undefined;
    /** insert data into the table: "meals" */
    insert_meals?: GraphQLTypes["meals_mutation_response"] | undefined;
    /** insert a single row into the table: "meals" */
    insert_meals_one?: GraphQLTypes["meals"] | undefined;
    /** insert data into the table: "order_delivery_status" */
    insert_order_delivery_status?:
      | GraphQLTypes["order_delivery_status_mutation_response"]
      | undefined;
    /** insert a single row into the table: "order_delivery_status" */
    insert_order_delivery_status_one?:
      | GraphQLTypes["order_delivery_status"]
      | undefined;
    /** insert data into the table: "orders" */
    insert_orders?: GraphQLTypes["orders_mutation_response"] | undefined;
    /** insert a single row into the table: "orders" */
    insert_orders_one?: GraphQLTypes["orders"] | undefined;
    /** insert data into the table: "slots" */
    insert_slots?: GraphQLTypes["slots_mutation_response"] | undefined;
    /** insert a single row into the table: "slots" */
    insert_slots_one?: GraphQLTypes["slots"] | undefined;
    /** insert data into the table: "subscription_plan_frequency" */
    insert_subscription_plan_frequency?:
      | GraphQLTypes["subscription_plan_frequency_mutation_response"]
      | undefined;
    /** insert a single row into the table: "subscription_plan_frequency" */
    insert_subscription_plan_frequency_one?:
      | GraphQLTypes["subscription_plan_frequency"]
      | undefined;
    /** insert data into the table: "subscription_plan_type" */
    insert_subscription_plan_type?:
      | GraphQLTypes["subscription_plan_type_mutation_response"]
      | undefined;
    /** insert a single row into the table: "subscription_plan_type" */
    insert_subscription_plan_type_one?:
      | GraphQLTypes["subscription_plan_type"]
      | undefined;
    /** insert data into the table: "subscription_plans" */
    insert_subscription_plans?:
      | GraphQLTypes["subscription_plans_mutation_response"]
      | undefined;
    /** insert a single row into the table: "subscription_plans" */
    insert_subscription_plans_one?:
      | GraphQLTypes["subscription_plans"]
      | undefined;
    /** insert data into the table: "subscriptions" */
    insert_subscriptions?:
      | GraphQLTypes["subscriptions_mutation_response"]
      | undefined;
    /** insert a single row into the table: "subscriptions" */
    insert_subscriptions_one?: GraphQLTypes["subscriptions"] | undefined;
    /** insert data into the table: "users" */
    insert_users?: GraphQLTypes["users_mutation_response"] | undefined;
    /** insert a single row into the table: "users" */
    insert_users_one?: GraphQLTypes["users"] | undefined;
    /** update data of the table: "meals" */
    update_meals?: GraphQLTypes["meals_mutation_response"] | undefined;
    /** update single row of the table: "meals" */
    update_meals_by_pk?: GraphQLTypes["meals"] | undefined;
    /** update multiples rows of table: "meals" */
    update_meals_many?:
      | Array<GraphQLTypes["meals_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "order_delivery_status" */
    update_order_delivery_status?:
      | GraphQLTypes["order_delivery_status_mutation_response"]
      | undefined;
    /** update single row of the table: "order_delivery_status" */
    update_order_delivery_status_by_pk?:
      | GraphQLTypes["order_delivery_status"]
      | undefined;
    /** update multiples rows of table: "order_delivery_status" */
    update_order_delivery_status_many?:
      | Array<
          GraphQLTypes["order_delivery_status_mutation_response"] | undefined
        >
      | undefined;
    /** update data of the table: "orders" */
    update_orders?: GraphQLTypes["orders_mutation_response"] | undefined;
    /** update single row of the table: "orders" */
    update_orders_by_pk?: GraphQLTypes["orders"] | undefined;
    /** update multiples rows of table: "orders" */
    update_orders_many?:
      | Array<GraphQLTypes["orders_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "slots" */
    update_slots?: GraphQLTypes["slots_mutation_response"] | undefined;
    /** update single row of the table: "slots" */
    update_slots_by_pk?: GraphQLTypes["slots"] | undefined;
    /** update multiples rows of table: "slots" */
    update_slots_many?:
      | Array<GraphQLTypes["slots_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "subscription_plan_frequency" */
    update_subscription_plan_frequency?:
      | GraphQLTypes["subscription_plan_frequency_mutation_response"]
      | undefined;
    /** update single row of the table: "subscription_plan_frequency" */
    update_subscription_plan_frequency_by_pk?:
      | GraphQLTypes["subscription_plan_frequency"]
      | undefined;
    /** update multiples rows of table: "subscription_plan_frequency" */
    update_subscription_plan_frequency_many?:
      | Array<
          | GraphQLTypes["subscription_plan_frequency_mutation_response"]
          | undefined
        >
      | undefined;
    /** update data of the table: "subscription_plan_type" */
    update_subscription_plan_type?:
      | GraphQLTypes["subscription_plan_type_mutation_response"]
      | undefined;
    /** update single row of the table: "subscription_plan_type" */
    update_subscription_plan_type_by_pk?:
      | GraphQLTypes["subscription_plan_type"]
      | undefined;
    /** update multiples rows of table: "subscription_plan_type" */
    update_subscription_plan_type_many?:
      | Array<
          GraphQLTypes["subscription_plan_type_mutation_response"] | undefined
        >
      | undefined;
    /** update data of the table: "subscription_plans" */
    update_subscription_plans?:
      | GraphQLTypes["subscription_plans_mutation_response"]
      | undefined;
    /** update single row of the table: "subscription_plans" */
    update_subscription_plans_by_pk?:
      | GraphQLTypes["subscription_plans"]
      | undefined;
    /** update multiples rows of table: "subscription_plans" */
    update_subscription_plans_many?:
      | Array<GraphQLTypes["subscription_plans_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "subscriptions" */
    update_subscriptions?:
      | GraphQLTypes["subscriptions_mutation_response"]
      | undefined;
    /** update single row of the table: "subscriptions" */
    update_subscriptions_by_pk?: GraphQLTypes["subscriptions"] | undefined;
    /** update multiples rows of table: "subscriptions" */
    update_subscriptions_many?:
      | Array<GraphQLTypes["subscriptions_mutation_response"] | undefined>
      | undefined;
    /** update data of the table: "users" */
    update_users?: GraphQLTypes["users_mutation_response"] | undefined;
    /** update single row of the table: "users" */
    update_users_by_pk?: GraphQLTypes["users"] | undefined;
    /** update multiples rows of table: "users" */
    update_users_many?:
      | Array<GraphQLTypes["users_mutation_response"] | undefined>
      | undefined;
  };
  /** column ordering options */
  ["order_by"]: order_by;
  /** columns and relationships of "order_delivery_status" */
  ["order_delivery_status"]: {
    __typename: "order_delivery_status";
    value: string;
  };
  /** aggregated selection of "order_delivery_status" */
  ["order_delivery_status_aggregate"]: {
    __typename: "order_delivery_status_aggregate";
    aggregate?:
      | GraphQLTypes["order_delivery_status_aggregate_fields"]
      | undefined;
    nodes: Array<GraphQLTypes["order_delivery_status"]>;
  };
  /** aggregate fields of "order_delivery_status" */
  ["order_delivery_status_aggregate_fields"]: {
    __typename: "order_delivery_status_aggregate_fields";
    count: number;
    max?: GraphQLTypes["order_delivery_status_max_fields"] | undefined;
    min?: GraphQLTypes["order_delivery_status_min_fields"] | undefined;
  };
  /** Boolean expression to filter rows from the table "order_delivery_status". All fields are combined with a logical 'AND'. */
  ["order_delivery_status_bool_exp"]: {
    _and?: Array<GraphQLTypes["order_delivery_status_bool_exp"]> | undefined;
    _not?: GraphQLTypes["order_delivery_status_bool_exp"] | undefined;
    _or?: Array<GraphQLTypes["order_delivery_status_bool_exp"]> | undefined;
    value?: GraphQLTypes["String_comparison_exp"] | undefined;
  };
  /** unique or primary key constraints on table "order_delivery_status" */
  ["order_delivery_status_constraint"]: order_delivery_status_constraint;
  ["order_delivery_status_enum"]: order_delivery_status_enum;
  /** Boolean expression to compare columns of type "order_delivery_status_enum". All fields are combined with logical 'AND'. */
  ["order_delivery_status_enum_comparison_exp"]: {
    _eq?: GraphQLTypes["order_delivery_status_enum"] | undefined;
    _in?: Array<GraphQLTypes["order_delivery_status_enum"]> | undefined;
    _is_null?: boolean | undefined;
    _neq?: GraphQLTypes["order_delivery_status_enum"] | undefined;
    _nin?: Array<GraphQLTypes["order_delivery_status_enum"]> | undefined;
  };
  /** input type for inserting data into table "order_delivery_status" */
  ["order_delivery_status_insert_input"]: {
    value?: string | undefined;
  };
  /** aggregate max on columns */
  ["order_delivery_status_max_fields"]: {
    __typename: "order_delivery_status_max_fields";
    value?: string | undefined;
  };
  /** aggregate min on columns */
  ["order_delivery_status_min_fields"]: {
    __typename: "order_delivery_status_min_fields";
    value?: string | undefined;
  };
  /** response of any mutation on the table "order_delivery_status" */
  ["order_delivery_status_mutation_response"]: {
    __typename: "order_delivery_status_mutation_response";
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<GraphQLTypes["order_delivery_status"]>;
  };
  /** on_conflict condition type for table "order_delivery_status" */
  ["order_delivery_status_on_conflict"]: {
    constraint: GraphQLTypes["order_delivery_status_constraint"];
    update_columns: Array<GraphQLTypes["order_delivery_status_update_column"]>;
    where?: GraphQLTypes["order_delivery_status_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "order_delivery_status". */
  ["order_delivery_status_order_by"]: {
    value?: GraphQLTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: order_delivery_status */
  ["order_delivery_status_pk_columns_input"]: {
    value: string;
  };
  /** select columns of table "order_delivery_status" */
  ["order_delivery_status_select_column"]: order_delivery_status_select_column;
  /** input type for updating data in table "order_delivery_status" */
  ["order_delivery_status_set_input"]: {
    value?: string | undefined;
  };
  /** Streaming cursor of the table "order_delivery_status" */
  ["order_delivery_status_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: GraphQLTypes["order_delivery_status_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: GraphQLTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["order_delivery_status_stream_cursor_value_input"]: {
    value?: string | undefined;
  };
  /** update columns of table "order_delivery_status" */
  ["order_delivery_status_update_column"]: order_delivery_status_update_column;
  ["order_delivery_status_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?: GraphQLTypes["order_delivery_status_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: GraphQLTypes["order_delivery_status_bool_exp"];
  };
  /** columns and relationships of "orders" */
  ["orders"]: {
    __typename: "orders";
    created_at: GraphQLTypes["timestamptz"];
    deliveredAt?: GraphQLTypes["timestamptz"] | undefined;
    delivery_date: GraphQLTypes["date"];
    id: GraphQLTypes["uuid"];
    meal_id: number;
    slot_id: number;
    status?: GraphQLTypes["order_delivery_status_enum"] | undefined;
    subscription_id: GraphQLTypes["uuid"];
    updated_at: GraphQLTypes["timestamptz"];
  };
  /** aggregated selection of "orders" */
  ["orders_aggregate"]: {
    __typename: "orders_aggregate";
    aggregate?: GraphQLTypes["orders_aggregate_fields"] | undefined;
    nodes: Array<GraphQLTypes["orders"]>;
  };
  /** aggregate fields of "orders" */
  ["orders_aggregate_fields"]: {
    __typename: "orders_aggregate_fields";
    avg?: GraphQLTypes["orders_avg_fields"] | undefined;
    count: number;
    max?: GraphQLTypes["orders_max_fields"] | undefined;
    min?: GraphQLTypes["orders_min_fields"] | undefined;
    stddev?: GraphQLTypes["orders_stddev_fields"] | undefined;
    stddev_pop?: GraphQLTypes["orders_stddev_pop_fields"] | undefined;
    stddev_samp?: GraphQLTypes["orders_stddev_samp_fields"] | undefined;
    sum?: GraphQLTypes["orders_sum_fields"] | undefined;
    var_pop?: GraphQLTypes["orders_var_pop_fields"] | undefined;
    var_samp?: GraphQLTypes["orders_var_samp_fields"] | undefined;
    variance?: GraphQLTypes["orders_variance_fields"] | undefined;
  };
  /** aggregate avg on columns */
  ["orders_avg_fields"]: {
    __typename: "orders_avg_fields";
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** Boolean expression to filter rows from the table "orders". All fields are combined with a logical 'AND'. */
  ["orders_bool_exp"]: {
    _and?: Array<GraphQLTypes["orders_bool_exp"]> | undefined;
    _not?: GraphQLTypes["orders_bool_exp"] | undefined;
    _or?: Array<GraphQLTypes["orders_bool_exp"]> | undefined;
    created_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined;
    deliveredAt?: GraphQLTypes["timestamptz_comparison_exp"] | undefined;
    delivery_date?: GraphQLTypes["date_comparison_exp"] | undefined;
    id?: GraphQLTypes["uuid_comparison_exp"] | undefined;
    meal_id?: GraphQLTypes["Int_comparison_exp"] | undefined;
    slot_id?: GraphQLTypes["Int_comparison_exp"] | undefined;
    status?:
      | GraphQLTypes["order_delivery_status_enum_comparison_exp"]
      | undefined;
    subscription_id?: GraphQLTypes["uuid_comparison_exp"] | undefined;
    updated_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined;
  };
  /** unique or primary key constraints on table "orders" */
  ["orders_constraint"]: orders_constraint;
  /** input type for incrementing numeric columns in table "orders" */
  ["orders_inc_input"]: {
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** input type for inserting data into table "orders" */
  ["orders_insert_input"]: {
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    deliveredAt?: GraphQLTypes["timestamptz"] | undefined;
    delivery_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    status?: GraphQLTypes["order_delivery_status_enum"] | undefined;
    subscription_id?: GraphQLTypes["uuid"] | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
  };
  /** aggregate max on columns */
  ["orders_max_fields"]: {
    __typename: "orders_max_fields";
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    deliveredAt?: GraphQLTypes["timestamptz"] | undefined;
    delivery_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    subscription_id?: GraphQLTypes["uuid"] | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
  };
  /** aggregate min on columns */
  ["orders_min_fields"]: {
    __typename: "orders_min_fields";
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    deliveredAt?: GraphQLTypes["timestamptz"] | undefined;
    delivery_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    subscription_id?: GraphQLTypes["uuid"] | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
  };
  /** response of any mutation on the table "orders" */
  ["orders_mutation_response"]: {
    __typename: "orders_mutation_response";
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<GraphQLTypes["orders"]>;
  };
  /** on_conflict condition type for table "orders" */
  ["orders_on_conflict"]: {
    constraint: GraphQLTypes["orders_constraint"];
    update_columns: Array<GraphQLTypes["orders_update_column"]>;
    where?: GraphQLTypes["orders_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "orders". */
  ["orders_order_by"]: {
    created_at?: GraphQLTypes["order_by"] | undefined;
    deliveredAt?: GraphQLTypes["order_by"] | undefined;
    delivery_date?: GraphQLTypes["order_by"] | undefined;
    id?: GraphQLTypes["order_by"] | undefined;
    meal_id?: GraphQLTypes["order_by"] | undefined;
    slot_id?: GraphQLTypes["order_by"] | undefined;
    status?: GraphQLTypes["order_by"] | undefined;
    subscription_id?: GraphQLTypes["order_by"] | undefined;
    updated_at?: GraphQLTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: orders */
  ["orders_pk_columns_input"]: {
    id: GraphQLTypes["uuid"];
  };
  /** select columns of table "orders" */
  ["orders_select_column"]: orders_select_column;
  /** input type for updating data in table "orders" */
  ["orders_set_input"]: {
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    deliveredAt?: GraphQLTypes["timestamptz"] | undefined;
    delivery_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    status?: GraphQLTypes["order_delivery_status_enum"] | undefined;
    subscription_id?: GraphQLTypes["uuid"] | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
  };
  /** aggregate stddev on columns */
  ["orders_stddev_fields"]: {
    __typename: "orders_stddev_fields";
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["orders_stddev_pop_fields"]: {
    __typename: "orders_stddev_pop_fields";
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["orders_stddev_samp_fields"]: {
    __typename: "orders_stddev_samp_fields";
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** Streaming cursor of the table "orders" */
  ["orders_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: GraphQLTypes["orders_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: GraphQLTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["orders_stream_cursor_value_input"]: {
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    deliveredAt?: GraphQLTypes["timestamptz"] | undefined;
    delivery_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    meal_id?: number | undefined;
    slot_id?: number | undefined;
    status?: GraphQLTypes["order_delivery_status_enum"] | undefined;
    subscription_id?: GraphQLTypes["uuid"] | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
  };
  /** aggregate sum on columns */
  ["orders_sum_fields"]: {
    __typename: "orders_sum_fields";
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** update columns of table "orders" */
  ["orders_update_column"]: orders_update_column;
  ["orders_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: GraphQLTypes["orders_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: GraphQLTypes["orders_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: GraphQLTypes["orders_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["orders_var_pop_fields"]: {
    __typename: "orders_var_pop_fields";
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** aggregate var_samp on columns */
  ["orders_var_samp_fields"]: {
    __typename: "orders_var_samp_fields";
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  /** aggregate variance on columns */
  ["orders_variance_fields"]: {
    __typename: "orders_variance_fields";
    meal_id?: number | undefined;
    slot_id?: number | undefined;
  };
  ["query_root"]: {
    __typename: "query_root";
    /** fetch data from the table: "meals" */
    meals: Array<GraphQLTypes["meals"]>;
    /** fetch aggregated fields from the table: "meals" */
    meals_aggregate: GraphQLTypes["meals_aggregate"];
    /** fetch data from the table: "meals" using primary key columns */
    meals_by_pk?: GraphQLTypes["meals"] | undefined;
    /** fetch data from the table: "order_delivery_status" */
    order_delivery_status: Array<GraphQLTypes["order_delivery_status"]>;
    /** fetch aggregated fields from the table: "order_delivery_status" */
    order_delivery_status_aggregate: GraphQLTypes["order_delivery_status_aggregate"];
    /** fetch data from the table: "order_delivery_status" using primary key columns */
    order_delivery_status_by_pk?:
      | GraphQLTypes["order_delivery_status"]
      | undefined;
    /** fetch data from the table: "orders" */
    orders: Array<GraphQLTypes["orders"]>;
    /** fetch aggregated fields from the table: "orders" */
    orders_aggregate: GraphQLTypes["orders_aggregate"];
    /** fetch data from the table: "orders" using primary key columns */
    orders_by_pk?: GraphQLTypes["orders"] | undefined;
    /** fetch data from the table: "slots" */
    slots: Array<GraphQLTypes["slots"]>;
    /** fetch aggregated fields from the table: "slots" */
    slots_aggregate: GraphQLTypes["slots_aggregate"];
    /** fetch data from the table: "slots" using primary key columns */
    slots_by_pk?: GraphQLTypes["slots"] | undefined;
    /** fetch data from the table: "subscription_plan_frequency" */
    subscription_plan_frequency: Array<
      GraphQLTypes["subscription_plan_frequency"]
    >;
    /** fetch aggregated fields from the table: "subscription_plan_frequency" */
    subscription_plan_frequency_aggregate: GraphQLTypes["subscription_plan_frequency_aggregate"];
    /** fetch data from the table: "subscription_plan_frequency" using primary key columns */
    subscription_plan_frequency_by_pk?:
      | GraphQLTypes["subscription_plan_frequency"]
      | undefined;
    /** fetch data from the table: "subscription_plan_type" */
    subscription_plan_type: Array<GraphQLTypes["subscription_plan_type"]>;
    /** fetch aggregated fields from the table: "subscription_plan_type" */
    subscription_plan_type_aggregate: GraphQLTypes["subscription_plan_type_aggregate"];
    /** fetch data from the table: "subscription_plan_type" using primary key columns */
    subscription_plan_type_by_pk?:
      | GraphQLTypes["subscription_plan_type"]
      | undefined;
    /** An array relationship */
    subscription_plans: Array<GraphQLTypes["subscription_plans"]>;
    /** An aggregate relationship */
    subscription_plans_aggregate: GraphQLTypes["subscription_plans_aggregate"];
    /** fetch data from the table: "subscription_plans" using primary key columns */
    subscription_plans_by_pk?: GraphQLTypes["subscription_plans"] | undefined;
    /** fetch data from the table: "subscriptions" */
    subscriptions: Array<GraphQLTypes["subscriptions"]>;
    /** fetch aggregated fields from the table: "subscriptions" */
    subscriptions_aggregate: GraphQLTypes["subscriptions_aggregate"];
    /** fetch data from the table: "subscriptions" using primary key columns */
    subscriptions_by_pk?: GraphQLTypes["subscriptions"] | undefined;
    /** fetch data from the table: "users" */
    users: Array<GraphQLTypes["users"]>;
    /** fetch aggregated fields from the table: "users" */
    users_aggregate: GraphQLTypes["users_aggregate"];
    /** fetch data from the table: "users" using primary key columns */
    users_by_pk?: GraphQLTypes["users"] | undefined;
  };
  /** columns and relationships of "slots" */
  ["slots"]: {
    __typename: "slots";
    from: GraphQLTypes["time"];
    id: number;
    to: GraphQLTypes["timetz"];
    type: GraphQLTypes["subscription_plan_frequency_enum"];
  };
  /** aggregated selection of "slots" */
  ["slots_aggregate"]: {
    __typename: "slots_aggregate";
    aggregate?: GraphQLTypes["slots_aggregate_fields"] | undefined;
    nodes: Array<GraphQLTypes["slots"]>;
  };
  /** aggregate fields of "slots" */
  ["slots_aggregate_fields"]: {
    __typename: "slots_aggregate_fields";
    avg?: GraphQLTypes["slots_avg_fields"] | undefined;
    count: number;
    max?: GraphQLTypes["slots_max_fields"] | undefined;
    min?: GraphQLTypes["slots_min_fields"] | undefined;
    stddev?: GraphQLTypes["slots_stddev_fields"] | undefined;
    stddev_pop?: GraphQLTypes["slots_stddev_pop_fields"] | undefined;
    stddev_samp?: GraphQLTypes["slots_stddev_samp_fields"] | undefined;
    sum?: GraphQLTypes["slots_sum_fields"] | undefined;
    var_pop?: GraphQLTypes["slots_var_pop_fields"] | undefined;
    var_samp?: GraphQLTypes["slots_var_samp_fields"] | undefined;
    variance?: GraphQLTypes["slots_variance_fields"] | undefined;
  };
  /** aggregate avg on columns */
  ["slots_avg_fields"]: {
    __typename: "slots_avg_fields";
    id?: number | undefined;
  };
  /** Boolean expression to filter rows from the table "slots". All fields are combined with a logical 'AND'. */
  ["slots_bool_exp"]: {
    _and?: Array<GraphQLTypes["slots_bool_exp"]> | undefined;
    _not?: GraphQLTypes["slots_bool_exp"] | undefined;
    _or?: Array<GraphQLTypes["slots_bool_exp"]> | undefined;
    from?: GraphQLTypes["time_comparison_exp"] | undefined;
    id?: GraphQLTypes["Int_comparison_exp"] | undefined;
    to?: GraphQLTypes["timetz_comparison_exp"] | undefined;
    type?:
      | GraphQLTypes["subscription_plan_frequency_enum_comparison_exp"]
      | undefined;
  };
  /** unique or primary key constraints on table "slots" */
  ["slots_constraint"]: slots_constraint;
  /** input type for incrementing numeric columns in table "slots" */
  ["slots_inc_input"]: {
    id?: number | undefined;
  };
  /** input type for inserting data into table "slots" */
  ["slots_insert_input"]: {
    from?: GraphQLTypes["time"] | undefined;
    id?: number | undefined;
    to?: GraphQLTypes["timetz"] | undefined;
    type?: GraphQLTypes["subscription_plan_frequency_enum"] | undefined;
  };
  /** aggregate max on columns */
  ["slots_max_fields"]: {
    __typename: "slots_max_fields";
    id?: number | undefined;
    to?: GraphQLTypes["timetz"] | undefined;
  };
  /** aggregate min on columns */
  ["slots_min_fields"]: {
    __typename: "slots_min_fields";
    id?: number | undefined;
    to?: GraphQLTypes["timetz"] | undefined;
  };
  /** response of any mutation on the table "slots" */
  ["slots_mutation_response"]: {
    __typename: "slots_mutation_response";
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<GraphQLTypes["slots"]>;
  };
  /** on_conflict condition type for table "slots" */
  ["slots_on_conflict"]: {
    constraint: GraphQLTypes["slots_constraint"];
    update_columns: Array<GraphQLTypes["slots_update_column"]>;
    where?: GraphQLTypes["slots_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "slots". */
  ["slots_order_by"]: {
    from?: GraphQLTypes["order_by"] | undefined;
    id?: GraphQLTypes["order_by"] | undefined;
    to?: GraphQLTypes["order_by"] | undefined;
    type?: GraphQLTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: slots */
  ["slots_pk_columns_input"]: {
    id: number;
  };
  /** select columns of table "slots" */
  ["slots_select_column"]: slots_select_column;
  /** input type for updating data in table "slots" */
  ["slots_set_input"]: {
    from?: GraphQLTypes["time"] | undefined;
    id?: number | undefined;
    to?: GraphQLTypes["timetz"] | undefined;
    type?: GraphQLTypes["subscription_plan_frequency_enum"] | undefined;
  };
  /** aggregate stddev on columns */
  ["slots_stddev_fields"]: {
    __typename: "slots_stddev_fields";
    id?: number | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["slots_stddev_pop_fields"]: {
    __typename: "slots_stddev_pop_fields";
    id?: number | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["slots_stddev_samp_fields"]: {
    __typename: "slots_stddev_samp_fields";
    id?: number | undefined;
  };
  /** Streaming cursor of the table "slots" */
  ["slots_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: GraphQLTypes["slots_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: GraphQLTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["slots_stream_cursor_value_input"]: {
    from?: GraphQLTypes["time"] | undefined;
    id?: number | undefined;
    to?: GraphQLTypes["timetz"] | undefined;
    type?: GraphQLTypes["subscription_plan_frequency_enum"] | undefined;
  };
  /** aggregate sum on columns */
  ["slots_sum_fields"]: {
    __typename: "slots_sum_fields";
    id?: number | undefined;
  };
  /** update columns of table "slots" */
  ["slots_update_column"]: slots_update_column;
  ["slots_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: GraphQLTypes["slots_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: GraphQLTypes["slots_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: GraphQLTypes["slots_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["slots_var_pop_fields"]: {
    __typename: "slots_var_pop_fields";
    id?: number | undefined;
  };
  /** aggregate var_samp on columns */
  ["slots_var_samp_fields"]: {
    __typename: "slots_var_samp_fields";
    id?: number | undefined;
  };
  /** aggregate variance on columns */
  ["slots_variance_fields"]: {
    __typename: "slots_variance_fields";
    id?: number | undefined;
  };
  /** columns and relationships of "subscription_plan_frequency" */
  ["subscription_plan_frequency"]: {
    __typename: "subscription_plan_frequency";
    /** An array relationship */
    subscription_plans: Array<GraphQLTypes["subscription_plans"]>;
    /** An aggregate relationship */
    subscription_plans_aggregate: GraphQLTypes["subscription_plans_aggregate"];
    value: string;
  };
  /** aggregated selection of "subscription_plan_frequency" */
  ["subscription_plan_frequency_aggregate"]: {
    __typename: "subscription_plan_frequency_aggregate";
    aggregate?:
      | GraphQLTypes["subscription_plan_frequency_aggregate_fields"]
      | undefined;
    nodes: Array<GraphQLTypes["subscription_plan_frequency"]>;
  };
  /** aggregate fields of "subscription_plan_frequency" */
  ["subscription_plan_frequency_aggregate_fields"]: {
    __typename: "subscription_plan_frequency_aggregate_fields";
    count: number;
    max?: GraphQLTypes["subscription_plan_frequency_max_fields"] | undefined;
    min?: GraphQLTypes["subscription_plan_frequency_min_fields"] | undefined;
  };
  /** Boolean expression to filter rows from the table "subscription_plan_frequency". All fields are combined with a logical 'AND'. */
  ["subscription_plan_frequency_bool_exp"]: {
    _and?:
      | Array<GraphQLTypes["subscription_plan_frequency_bool_exp"]>
      | undefined;
    _not?: GraphQLTypes["subscription_plan_frequency_bool_exp"] | undefined;
    _or?:
      | Array<GraphQLTypes["subscription_plan_frequency_bool_exp"]>
      | undefined;
    subscription_plans?:
      | GraphQLTypes["subscription_plans_bool_exp"]
      | undefined;
    subscription_plans_aggregate?:
      | GraphQLTypes["subscription_plans_aggregate_bool_exp"]
      | undefined;
    value?: GraphQLTypes["String_comparison_exp"] | undefined;
  };
  /** unique or primary key constraints on table "subscription_plan_frequency" */
  ["subscription_plan_frequency_constraint"]: subscription_plan_frequency_constraint;
  ["subscription_plan_frequency_enum"]: subscription_plan_frequency_enum;
  /** Boolean expression to compare columns of type "subscription_plan_frequency_enum". All fields are combined with logical 'AND'. */
  ["subscription_plan_frequency_enum_comparison_exp"]: {
    _eq?: GraphQLTypes["subscription_plan_frequency_enum"] | undefined;
    _in?: Array<GraphQLTypes["subscription_plan_frequency_enum"]> | undefined;
    _is_null?: boolean | undefined;
    _neq?: GraphQLTypes["subscription_plan_frequency_enum"] | undefined;
    _nin?: Array<GraphQLTypes["subscription_plan_frequency_enum"]> | undefined;
  };
  /** input type for inserting data into table "subscription_plan_frequency" */
  ["subscription_plan_frequency_insert_input"]: {
    subscription_plans?:
      | GraphQLTypes["subscription_plans_arr_rel_insert_input"]
      | undefined;
    value?: string | undefined;
  };
  /** aggregate max on columns */
  ["subscription_plan_frequency_max_fields"]: {
    __typename: "subscription_plan_frequency_max_fields";
    value?: string | undefined;
  };
  /** aggregate min on columns */
  ["subscription_plan_frequency_min_fields"]: {
    __typename: "subscription_plan_frequency_min_fields";
    value?: string | undefined;
  };
  /** response of any mutation on the table "subscription_plan_frequency" */
  ["subscription_plan_frequency_mutation_response"]: {
    __typename: "subscription_plan_frequency_mutation_response";
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<GraphQLTypes["subscription_plan_frequency"]>;
  };
  /** input type for inserting object relation for remote table "subscription_plan_frequency" */
  ["subscription_plan_frequency_obj_rel_insert_input"]: {
    data: GraphQLTypes["subscription_plan_frequency_insert_input"];
    /** upsert condition */
    on_conflict?:
      | GraphQLTypes["subscription_plan_frequency_on_conflict"]
      | undefined;
  };
  /** on_conflict condition type for table "subscription_plan_frequency" */
  ["subscription_plan_frequency_on_conflict"]: {
    constraint: GraphQLTypes["subscription_plan_frequency_constraint"];
    update_columns: Array<
      GraphQLTypes["subscription_plan_frequency_update_column"]
    >;
    where?: GraphQLTypes["subscription_plan_frequency_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "subscription_plan_frequency". */
  ["subscription_plan_frequency_order_by"]: {
    subscription_plans_aggregate?:
      | GraphQLTypes["subscription_plans_aggregate_order_by"]
      | undefined;
    value?: GraphQLTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: subscription_plan_frequency */
  ["subscription_plan_frequency_pk_columns_input"]: {
    value: string;
  };
  /** select columns of table "subscription_plan_frequency" */
  ["subscription_plan_frequency_select_column"]: subscription_plan_frequency_select_column;
  /** input type for updating data in table "subscription_plan_frequency" */
  ["subscription_plan_frequency_set_input"]: {
    value?: string | undefined;
  };
  /** Streaming cursor of the table "subscription_plan_frequency" */
  ["subscription_plan_frequency_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: GraphQLTypes["subscription_plan_frequency_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: GraphQLTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plan_frequency_stream_cursor_value_input"]: {
    value?: string | undefined;
  };
  /** update columns of table "subscription_plan_frequency" */
  ["subscription_plan_frequency_update_column"]: subscription_plan_frequency_update_column;
  ["subscription_plan_frequency_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?: GraphQLTypes["subscription_plan_frequency_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: GraphQLTypes["subscription_plan_frequency_bool_exp"];
  };
  /** columns and relationships of "subscription_plan_type" */
  ["subscription_plan_type"]: {
    __typename: "subscription_plan_type";
    /** An array relationship */
    subscription_plans: Array<GraphQLTypes["subscription_plans"]>;
    /** An aggregate relationship */
    subscription_plans_aggregate: GraphQLTypes["subscription_plans_aggregate"];
    value: string;
  };
  /** aggregated selection of "subscription_plan_type" */
  ["subscription_plan_type_aggregate"]: {
    __typename: "subscription_plan_type_aggregate";
    aggregate?:
      | GraphQLTypes["subscription_plan_type_aggregate_fields"]
      | undefined;
    nodes: Array<GraphQLTypes["subscription_plan_type"]>;
  };
  /** aggregate fields of "subscription_plan_type" */
  ["subscription_plan_type_aggregate_fields"]: {
    __typename: "subscription_plan_type_aggregate_fields";
    count: number;
    max?: GraphQLTypes["subscription_plan_type_max_fields"] | undefined;
    min?: GraphQLTypes["subscription_plan_type_min_fields"] | undefined;
  };
  /** Boolean expression to filter rows from the table "subscription_plan_type". All fields are combined with a logical 'AND'. */
  ["subscription_plan_type_bool_exp"]: {
    _and?: Array<GraphQLTypes["subscription_plan_type_bool_exp"]> | undefined;
    _not?: GraphQLTypes["subscription_plan_type_bool_exp"] | undefined;
    _or?: Array<GraphQLTypes["subscription_plan_type_bool_exp"]> | undefined;
    subscription_plans?:
      | GraphQLTypes["subscription_plans_bool_exp"]
      | undefined;
    subscription_plans_aggregate?:
      | GraphQLTypes["subscription_plans_aggregate_bool_exp"]
      | undefined;
    value?: GraphQLTypes["String_comparison_exp"] | undefined;
  };
  /** unique or primary key constraints on table "subscription_plan_type" */
  ["subscription_plan_type_constraint"]: subscription_plan_type_constraint;
  ["subscription_plan_type_enum"]: subscription_plan_type_enum;
  /** Boolean expression to compare columns of type "subscription_plan_type_enum". All fields are combined with logical 'AND'. */
  ["subscription_plan_type_enum_comparison_exp"]: {
    _eq?: GraphQLTypes["subscription_plan_type_enum"] | undefined;
    _in?: Array<GraphQLTypes["subscription_plan_type_enum"]> | undefined;
    _is_null?: boolean | undefined;
    _neq?: GraphQLTypes["subscription_plan_type_enum"] | undefined;
    _nin?: Array<GraphQLTypes["subscription_plan_type_enum"]> | undefined;
  };
  /** input type for inserting data into table "subscription_plan_type" */
  ["subscription_plan_type_insert_input"]: {
    subscription_plans?:
      | GraphQLTypes["subscription_plans_arr_rel_insert_input"]
      | undefined;
    value?: string | undefined;
  };
  /** aggregate max on columns */
  ["subscription_plan_type_max_fields"]: {
    __typename: "subscription_plan_type_max_fields";
    value?: string | undefined;
  };
  /** aggregate min on columns */
  ["subscription_plan_type_min_fields"]: {
    __typename: "subscription_plan_type_min_fields";
    value?: string | undefined;
  };
  /** response of any mutation on the table "subscription_plan_type" */
  ["subscription_plan_type_mutation_response"]: {
    __typename: "subscription_plan_type_mutation_response";
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<GraphQLTypes["subscription_plan_type"]>;
  };
  /** input type for inserting object relation for remote table "subscription_plan_type" */
  ["subscription_plan_type_obj_rel_insert_input"]: {
    data: GraphQLTypes["subscription_plan_type_insert_input"];
    /** upsert condition */
    on_conflict?:
      | GraphQLTypes["subscription_plan_type_on_conflict"]
      | undefined;
  };
  /** on_conflict condition type for table "subscription_plan_type" */
  ["subscription_plan_type_on_conflict"]: {
    constraint: GraphQLTypes["subscription_plan_type_constraint"];
    update_columns: Array<GraphQLTypes["subscription_plan_type_update_column"]>;
    where?: GraphQLTypes["subscription_plan_type_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "subscription_plan_type". */
  ["subscription_plan_type_order_by"]: {
    subscription_plans_aggregate?:
      | GraphQLTypes["subscription_plans_aggregate_order_by"]
      | undefined;
    value?: GraphQLTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: subscription_plan_type */
  ["subscription_plan_type_pk_columns_input"]: {
    value: string;
  };
  /** select columns of table "subscription_plan_type" */
  ["subscription_plan_type_select_column"]: subscription_plan_type_select_column;
  /** input type for updating data in table "subscription_plan_type" */
  ["subscription_plan_type_set_input"]: {
    value?: string | undefined;
  };
  /** Streaming cursor of the table "subscription_plan_type" */
  ["subscription_plan_type_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: GraphQLTypes["subscription_plan_type_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: GraphQLTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plan_type_stream_cursor_value_input"]: {
    value?: string | undefined;
  };
  /** update columns of table "subscription_plan_type" */
  ["subscription_plan_type_update_column"]: subscription_plan_type_update_column;
  ["subscription_plan_type_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?: GraphQLTypes["subscription_plan_type_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: GraphQLTypes["subscription_plan_type_bool_exp"];
  };
  /** columns and relationships of "subscription_plans" */
  ["subscription_plans"]: {
    __typename: "subscription_plans";
    frequency: GraphQLTypes["subscription_plan_frequency_enum"];
    id: number;
    is_non_veg: boolean;
    price: string;
    /** An object relationship */
    subscription_plan_frequency: GraphQLTypes["subscription_plan_frequency"];
    /** An object relationship */
    subscription_plan_type: GraphQLTypes["subscription_plan_type"];
    type: GraphQLTypes["subscription_plan_type_enum"];
  };
  /** aggregated selection of "subscription_plans" */
  ["subscription_plans_aggregate"]: {
    __typename: "subscription_plans_aggregate";
    aggregate?: GraphQLTypes["subscription_plans_aggregate_fields"] | undefined;
    nodes: Array<GraphQLTypes["subscription_plans"]>;
  };
  ["subscription_plans_aggregate_bool_exp"]: {
    bool_and?:
      | GraphQLTypes["subscription_plans_aggregate_bool_exp_bool_and"]
      | undefined;
    bool_or?:
      | GraphQLTypes["subscription_plans_aggregate_bool_exp_bool_or"]
      | undefined;
    count?:
      | GraphQLTypes["subscription_plans_aggregate_bool_exp_count"]
      | undefined;
  };
  ["subscription_plans_aggregate_bool_exp_bool_and"]: {
    arguments: GraphQLTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"];
    distinct?: boolean | undefined;
    filter?: GraphQLTypes["subscription_plans_bool_exp"] | undefined;
    predicate: GraphQLTypes["Boolean_comparison_exp"];
  };
  ["subscription_plans_aggregate_bool_exp_bool_or"]: {
    arguments: GraphQLTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"];
    distinct?: boolean | undefined;
    filter?: GraphQLTypes["subscription_plans_bool_exp"] | undefined;
    predicate: GraphQLTypes["Boolean_comparison_exp"];
  };
  ["subscription_plans_aggregate_bool_exp_count"]: {
    arguments?:
      | Array<GraphQLTypes["subscription_plans_select_column"]>
      | undefined;
    distinct?: boolean | undefined;
    filter?: GraphQLTypes["subscription_plans_bool_exp"] | undefined;
    predicate: GraphQLTypes["Int_comparison_exp"];
  };
  /** aggregate fields of "subscription_plans" */
  ["subscription_plans_aggregate_fields"]: {
    __typename: "subscription_plans_aggregate_fields";
    avg?: GraphQLTypes["subscription_plans_avg_fields"] | undefined;
    count: number;
    max?: GraphQLTypes["subscription_plans_max_fields"] | undefined;
    min?: GraphQLTypes["subscription_plans_min_fields"] | undefined;
    stddev?: GraphQLTypes["subscription_plans_stddev_fields"] | undefined;
    stddev_pop?:
      | GraphQLTypes["subscription_plans_stddev_pop_fields"]
      | undefined;
    stddev_samp?:
      | GraphQLTypes["subscription_plans_stddev_samp_fields"]
      | undefined;
    sum?: GraphQLTypes["subscription_plans_sum_fields"] | undefined;
    var_pop?: GraphQLTypes["subscription_plans_var_pop_fields"] | undefined;
    var_samp?: GraphQLTypes["subscription_plans_var_samp_fields"] | undefined;
    variance?: GraphQLTypes["subscription_plans_variance_fields"] | undefined;
  };
  /** order by aggregate values of table "subscription_plans" */
  ["subscription_plans_aggregate_order_by"]: {
    avg?: GraphQLTypes["subscription_plans_avg_order_by"] | undefined;
    count?: GraphQLTypes["order_by"] | undefined;
    max?: GraphQLTypes["subscription_plans_max_order_by"] | undefined;
    min?: GraphQLTypes["subscription_plans_min_order_by"] | undefined;
    stddev?: GraphQLTypes["subscription_plans_stddev_order_by"] | undefined;
    stddev_pop?:
      | GraphQLTypes["subscription_plans_stddev_pop_order_by"]
      | undefined;
    stddev_samp?:
      | GraphQLTypes["subscription_plans_stddev_samp_order_by"]
      | undefined;
    sum?: GraphQLTypes["subscription_plans_sum_order_by"] | undefined;
    var_pop?: GraphQLTypes["subscription_plans_var_pop_order_by"] | undefined;
    var_samp?: GraphQLTypes["subscription_plans_var_samp_order_by"] | undefined;
    variance?: GraphQLTypes["subscription_plans_variance_order_by"] | undefined;
  };
  /** input type for inserting array relation for remote table "subscription_plans" */
  ["subscription_plans_arr_rel_insert_input"]: {
    data: Array<GraphQLTypes["subscription_plans_insert_input"]>;
    /** upsert condition */
    on_conflict?: GraphQLTypes["subscription_plans_on_conflict"] | undefined;
  };
  /** aggregate avg on columns */
  ["subscription_plans_avg_fields"]: {
    __typename: "subscription_plans_avg_fields";
    id?: number | undefined;
  };
  /** order by avg() on columns of table "subscription_plans" */
  ["subscription_plans_avg_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
  };
  /** Boolean expression to filter rows from the table "subscription_plans". All fields are combined with a logical 'AND'. */
  ["subscription_plans_bool_exp"]: {
    _and?: Array<GraphQLTypes["subscription_plans_bool_exp"]> | undefined;
    _not?: GraphQLTypes["subscription_plans_bool_exp"] | undefined;
    _or?: Array<GraphQLTypes["subscription_plans_bool_exp"]> | undefined;
    frequency?:
      | GraphQLTypes["subscription_plan_frequency_enum_comparison_exp"]
      | undefined;
    id?: GraphQLTypes["Int_comparison_exp"] | undefined;
    is_non_veg?: GraphQLTypes["Boolean_comparison_exp"] | undefined;
    price?: GraphQLTypes["String_comparison_exp"] | undefined;
    subscription_plan_frequency?:
      | GraphQLTypes["subscription_plan_frequency_bool_exp"]
      | undefined;
    subscription_plan_type?:
      | GraphQLTypes["subscription_plan_type_bool_exp"]
      | undefined;
    type?:
      | GraphQLTypes["subscription_plan_type_enum_comparison_exp"]
      | undefined;
  };
  /** unique or primary key constraints on table "subscription_plans" */
  ["subscription_plans_constraint"]: subscription_plans_constraint;
  /** input type for incrementing numeric columns in table "subscription_plans" */
  ["subscription_plans_inc_input"]: {
    id?: number | undefined;
  };
  /** input type for inserting data into table "subscription_plans" */
  ["subscription_plans_insert_input"]: {
    frequency?: GraphQLTypes["subscription_plan_frequency_enum"] | undefined;
    id?: number | undefined;
    is_non_veg?: boolean | undefined;
    price?: string | undefined;
    subscription_plan_frequency?:
      | GraphQLTypes["subscription_plan_frequency_obj_rel_insert_input"]
      | undefined;
    subscription_plan_type?:
      | GraphQLTypes["subscription_plan_type_obj_rel_insert_input"]
      | undefined;
    type?: GraphQLTypes["subscription_plan_type_enum"] | undefined;
  };
  /** aggregate max on columns */
  ["subscription_plans_max_fields"]: {
    __typename: "subscription_plans_max_fields";
    id?: number | undefined;
    price?: string | undefined;
  };
  /** order by max() on columns of table "subscription_plans" */
  ["subscription_plans_max_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
    price?: GraphQLTypes["order_by"] | undefined;
  };
  /** aggregate min on columns */
  ["subscription_plans_min_fields"]: {
    __typename: "subscription_plans_min_fields";
    id?: number | undefined;
    price?: string | undefined;
  };
  /** order by min() on columns of table "subscription_plans" */
  ["subscription_plans_min_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
    price?: GraphQLTypes["order_by"] | undefined;
  };
  /** response of any mutation on the table "subscription_plans" */
  ["subscription_plans_mutation_response"]: {
    __typename: "subscription_plans_mutation_response";
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<GraphQLTypes["subscription_plans"]>;
  };
  /** on_conflict condition type for table "subscription_plans" */
  ["subscription_plans_on_conflict"]: {
    constraint: GraphQLTypes["subscription_plans_constraint"];
    update_columns: Array<GraphQLTypes["subscription_plans_update_column"]>;
    where?: GraphQLTypes["subscription_plans_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "subscription_plans". */
  ["subscription_plans_order_by"]: {
    frequency?: GraphQLTypes["order_by"] | undefined;
    id?: GraphQLTypes["order_by"] | undefined;
    is_non_veg?: GraphQLTypes["order_by"] | undefined;
    price?: GraphQLTypes["order_by"] | undefined;
    subscription_plan_frequency?:
      | GraphQLTypes["subscription_plan_frequency_order_by"]
      | undefined;
    subscription_plan_type?:
      | GraphQLTypes["subscription_plan_type_order_by"]
      | undefined;
    type?: GraphQLTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: subscription_plans */
  ["subscription_plans_pk_columns_input"]: {
    id: number;
  };
  /** select columns of table "subscription_plans" */
  ["subscription_plans_select_column"]: subscription_plans_select_column;
  /** select "subscription_plans_aggregate_bool_exp_bool_and_arguments_columns" columns of table "subscription_plans" */
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"]: subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns;
  /** select "subscription_plans_aggregate_bool_exp_bool_or_arguments_columns" columns of table "subscription_plans" */
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"]: subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns;
  /** input type for updating data in table "subscription_plans" */
  ["subscription_plans_set_input"]: {
    frequency?: GraphQLTypes["subscription_plan_frequency_enum"] | undefined;
    id?: number | undefined;
    is_non_veg?: boolean | undefined;
    price?: string | undefined;
    type?: GraphQLTypes["subscription_plan_type_enum"] | undefined;
  };
  /** aggregate stddev on columns */
  ["subscription_plans_stddev_fields"]: {
    __typename: "subscription_plans_stddev_fields";
    id?: number | undefined;
  };
  /** order by stddev() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["subscription_plans_stddev_pop_fields"]: {
    __typename: "subscription_plans_stddev_pop_fields";
    id?: number | undefined;
  };
  /** order by stddev_pop() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_pop_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["subscription_plans_stddev_samp_fields"]: {
    __typename: "subscription_plans_stddev_samp_fields";
    id?: number | undefined;
  };
  /** order by stddev_samp() on columns of table "subscription_plans" */
  ["subscription_plans_stddev_samp_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
  };
  /** Streaming cursor of the table "subscription_plans" */
  ["subscription_plans_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: GraphQLTypes["subscription_plans_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: GraphQLTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscription_plans_stream_cursor_value_input"]: {
    frequency?: GraphQLTypes["subscription_plan_frequency_enum"] | undefined;
    id?: number | undefined;
    is_non_veg?: boolean | undefined;
    price?: string | undefined;
    type?: GraphQLTypes["subscription_plan_type_enum"] | undefined;
  };
  /** aggregate sum on columns */
  ["subscription_plans_sum_fields"]: {
    __typename: "subscription_plans_sum_fields";
    id?: number | undefined;
  };
  /** order by sum() on columns of table "subscription_plans" */
  ["subscription_plans_sum_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
  };
  /** update columns of table "subscription_plans" */
  ["subscription_plans_update_column"]: subscription_plans_update_column;
  ["subscription_plans_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: GraphQLTypes["subscription_plans_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: GraphQLTypes["subscription_plans_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: GraphQLTypes["subscription_plans_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["subscription_plans_var_pop_fields"]: {
    __typename: "subscription_plans_var_pop_fields";
    id?: number | undefined;
  };
  /** order by var_pop() on columns of table "subscription_plans" */
  ["subscription_plans_var_pop_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
  };
  /** aggregate var_samp on columns */
  ["subscription_plans_var_samp_fields"]: {
    __typename: "subscription_plans_var_samp_fields";
    id?: number | undefined;
  };
  /** order by var_samp() on columns of table "subscription_plans" */
  ["subscription_plans_var_samp_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
  };
  /** aggregate variance on columns */
  ["subscription_plans_variance_fields"]: {
    __typename: "subscription_plans_variance_fields";
    id?: number | undefined;
  };
  /** order by variance() on columns of table "subscription_plans" */
  ["subscription_plans_variance_order_by"]: {
    id?: GraphQLTypes["order_by"] | undefined;
  };
  ["subscription_root"]: {
    __typename: "subscription_root";
    /** fetch data from the table: "meals" */
    meals: Array<GraphQLTypes["meals"]>;
    /** fetch aggregated fields from the table: "meals" */
    meals_aggregate: GraphQLTypes["meals_aggregate"];
    /** fetch data from the table: "meals" using primary key columns */
    meals_by_pk?: GraphQLTypes["meals"] | undefined;
    /** fetch data from the table in a streaming manner: "meals" */
    meals_stream: Array<GraphQLTypes["meals"]>;
    /** fetch data from the table: "order_delivery_status" */
    order_delivery_status: Array<GraphQLTypes["order_delivery_status"]>;
    /** fetch aggregated fields from the table: "order_delivery_status" */
    order_delivery_status_aggregate: GraphQLTypes["order_delivery_status_aggregate"];
    /** fetch data from the table: "order_delivery_status" using primary key columns */
    order_delivery_status_by_pk?:
      | GraphQLTypes["order_delivery_status"]
      | undefined;
    /** fetch data from the table in a streaming manner: "order_delivery_status" */
    order_delivery_status_stream: Array<GraphQLTypes["order_delivery_status"]>;
    /** fetch data from the table: "orders" */
    orders: Array<GraphQLTypes["orders"]>;
    /** fetch aggregated fields from the table: "orders" */
    orders_aggregate: GraphQLTypes["orders_aggregate"];
    /** fetch data from the table: "orders" using primary key columns */
    orders_by_pk?: GraphQLTypes["orders"] | undefined;
    /** fetch data from the table in a streaming manner: "orders" */
    orders_stream: Array<GraphQLTypes["orders"]>;
    /** fetch data from the table: "slots" */
    slots: Array<GraphQLTypes["slots"]>;
    /** fetch aggregated fields from the table: "slots" */
    slots_aggregate: GraphQLTypes["slots_aggregate"];
    /** fetch data from the table: "slots" using primary key columns */
    slots_by_pk?: GraphQLTypes["slots"] | undefined;
    /** fetch data from the table in a streaming manner: "slots" */
    slots_stream: Array<GraphQLTypes["slots"]>;
    /** fetch data from the table: "subscription_plan_frequency" */
    subscription_plan_frequency: Array<
      GraphQLTypes["subscription_plan_frequency"]
    >;
    /** fetch aggregated fields from the table: "subscription_plan_frequency" */
    subscription_plan_frequency_aggregate: GraphQLTypes["subscription_plan_frequency_aggregate"];
    /** fetch data from the table: "subscription_plan_frequency" using primary key columns */
    subscription_plan_frequency_by_pk?:
      | GraphQLTypes["subscription_plan_frequency"]
      | undefined;
    /** fetch data from the table in a streaming manner: "subscription_plan_frequency" */
    subscription_plan_frequency_stream: Array<
      GraphQLTypes["subscription_plan_frequency"]
    >;
    /** fetch data from the table: "subscription_plan_type" */
    subscription_plan_type: Array<GraphQLTypes["subscription_plan_type"]>;
    /** fetch aggregated fields from the table: "subscription_plan_type" */
    subscription_plan_type_aggregate: GraphQLTypes["subscription_plan_type_aggregate"];
    /** fetch data from the table: "subscription_plan_type" using primary key columns */
    subscription_plan_type_by_pk?:
      | GraphQLTypes["subscription_plan_type"]
      | undefined;
    /** fetch data from the table in a streaming manner: "subscription_plan_type" */
    subscription_plan_type_stream: Array<
      GraphQLTypes["subscription_plan_type"]
    >;
    /** An array relationship */
    subscription_plans: Array<GraphQLTypes["subscription_plans"]>;
    /** An aggregate relationship */
    subscription_plans_aggregate: GraphQLTypes["subscription_plans_aggregate"];
    /** fetch data from the table: "subscription_plans" using primary key columns */
    subscription_plans_by_pk?: GraphQLTypes["subscription_plans"] | undefined;
    /** fetch data from the table in a streaming manner: "subscription_plans" */
    subscription_plans_stream: Array<GraphQLTypes["subscription_plans"]>;
    /** fetch data from the table: "subscriptions" */
    subscriptions: Array<GraphQLTypes["subscriptions"]>;
    /** fetch aggregated fields from the table: "subscriptions" */
    subscriptions_aggregate: GraphQLTypes["subscriptions_aggregate"];
    /** fetch data from the table: "subscriptions" using primary key columns */
    subscriptions_by_pk?: GraphQLTypes["subscriptions"] | undefined;
    /** fetch data from the table in a streaming manner: "subscriptions" */
    subscriptions_stream: Array<GraphQLTypes["subscriptions"]>;
    /** fetch data from the table: "users" */
    users: Array<GraphQLTypes["users"]>;
    /** fetch aggregated fields from the table: "users" */
    users_aggregate: GraphQLTypes["users_aggregate"];
    /** fetch data from the table: "users" using primary key columns */
    users_by_pk?: GraphQLTypes["users"] | undefined;
    /** fetch data from the table in a streaming manner: "users" */
    users_stream: Array<GraphQLTypes["users"]>;
  };
  /** columns and relationships of "subscriptions" */
  ["subscriptions"]: {
    __typename: "subscriptions";
    assigned_chef?: GraphQLTypes["uuid"] | undefined;
    created_at: GraphQLTypes["timestamptz"];
    end_date: GraphQLTypes["date"];
    id: GraphQLTypes["uuid"];
    slot_id?: number | undefined;
    start_date: GraphQLTypes["date"];
    subscription_plan_id: number;
    updated_at: GraphQLTypes["timestamptz"];
    user_id: GraphQLTypes["uuid"];
  };
  /** aggregated selection of "subscriptions" */
  ["subscriptions_aggregate"]: {
    __typename: "subscriptions_aggregate";
    aggregate?: GraphQLTypes["subscriptions_aggregate_fields"] | undefined;
    nodes: Array<GraphQLTypes["subscriptions"]>;
  };
  /** aggregate fields of "subscriptions" */
  ["subscriptions_aggregate_fields"]: {
    __typename: "subscriptions_aggregate_fields";
    avg?: GraphQLTypes["subscriptions_avg_fields"] | undefined;
    count: number;
    max?: GraphQLTypes["subscriptions_max_fields"] | undefined;
    min?: GraphQLTypes["subscriptions_min_fields"] | undefined;
    stddev?: GraphQLTypes["subscriptions_stddev_fields"] | undefined;
    stddev_pop?: GraphQLTypes["subscriptions_stddev_pop_fields"] | undefined;
    stddev_samp?: GraphQLTypes["subscriptions_stddev_samp_fields"] | undefined;
    sum?: GraphQLTypes["subscriptions_sum_fields"] | undefined;
    var_pop?: GraphQLTypes["subscriptions_var_pop_fields"] | undefined;
    var_samp?: GraphQLTypes["subscriptions_var_samp_fields"] | undefined;
    variance?: GraphQLTypes["subscriptions_variance_fields"] | undefined;
  };
  /** aggregate avg on columns */
  ["subscriptions_avg_fields"]: {
    __typename: "subscriptions_avg_fields";
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** Boolean expression to filter rows from the table "subscriptions". All fields are combined with a logical 'AND'. */
  ["subscriptions_bool_exp"]: {
    _and?: Array<GraphQLTypes["subscriptions_bool_exp"]> | undefined;
    _not?: GraphQLTypes["subscriptions_bool_exp"] | undefined;
    _or?: Array<GraphQLTypes["subscriptions_bool_exp"]> | undefined;
    assigned_chef?: GraphQLTypes["uuid_comparison_exp"] | undefined;
    created_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined;
    end_date?: GraphQLTypes["date_comparison_exp"] | undefined;
    id?: GraphQLTypes["uuid_comparison_exp"] | undefined;
    slot_id?: GraphQLTypes["Int_comparison_exp"] | undefined;
    start_date?: GraphQLTypes["date_comparison_exp"] | undefined;
    subscription_plan_id?: GraphQLTypes["Int_comparison_exp"] | undefined;
    updated_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined;
    user_id?: GraphQLTypes["uuid_comparison_exp"] | undefined;
  };
  /** unique or primary key constraints on table "subscriptions" */
  ["subscriptions_constraint"]: subscriptions_constraint;
  /** input type for incrementing numeric columns in table "subscriptions" */
  ["subscriptions_inc_input"]: {
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** input type for inserting data into table "subscriptions" */
  ["subscriptions_insert_input"]: {
    assigned_chef?: GraphQLTypes["uuid"] | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    end_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: GraphQLTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    user_id?: GraphQLTypes["uuid"] | undefined;
  };
  /** aggregate max on columns */
  ["subscriptions_max_fields"]: {
    __typename: "subscriptions_max_fields";
    assigned_chef?: GraphQLTypes["uuid"] | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    end_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: GraphQLTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    user_id?: GraphQLTypes["uuid"] | undefined;
  };
  /** aggregate min on columns */
  ["subscriptions_min_fields"]: {
    __typename: "subscriptions_min_fields";
    assigned_chef?: GraphQLTypes["uuid"] | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    end_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: GraphQLTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    user_id?: GraphQLTypes["uuid"] | undefined;
  };
  /** response of any mutation on the table "subscriptions" */
  ["subscriptions_mutation_response"]: {
    __typename: "subscriptions_mutation_response";
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<GraphQLTypes["subscriptions"]>;
  };
  /** on_conflict condition type for table "subscriptions" */
  ["subscriptions_on_conflict"]: {
    constraint: GraphQLTypes["subscriptions_constraint"];
    update_columns: Array<GraphQLTypes["subscriptions_update_column"]>;
    where?: GraphQLTypes["subscriptions_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "subscriptions". */
  ["subscriptions_order_by"]: {
    assigned_chef?: GraphQLTypes["order_by"] | undefined;
    created_at?: GraphQLTypes["order_by"] | undefined;
    end_date?: GraphQLTypes["order_by"] | undefined;
    id?: GraphQLTypes["order_by"] | undefined;
    slot_id?: GraphQLTypes["order_by"] | undefined;
    start_date?: GraphQLTypes["order_by"] | undefined;
    subscription_plan_id?: GraphQLTypes["order_by"] | undefined;
    updated_at?: GraphQLTypes["order_by"] | undefined;
    user_id?: GraphQLTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: subscriptions */
  ["subscriptions_pk_columns_input"]: {
    id: GraphQLTypes["uuid"];
  };
  /** select columns of table "subscriptions" */
  ["subscriptions_select_column"]: subscriptions_select_column;
  /** input type for updating data in table "subscriptions" */
  ["subscriptions_set_input"]: {
    assigned_chef?: GraphQLTypes["uuid"] | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    end_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: GraphQLTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    user_id?: GraphQLTypes["uuid"] | undefined;
  };
  /** aggregate stddev on columns */
  ["subscriptions_stddev_fields"]: {
    __typename: "subscriptions_stddev_fields";
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** aggregate stddev_pop on columns */
  ["subscriptions_stddev_pop_fields"]: {
    __typename: "subscriptions_stddev_pop_fields";
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** aggregate stddev_samp on columns */
  ["subscriptions_stddev_samp_fields"]: {
    __typename: "subscriptions_stddev_samp_fields";
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** Streaming cursor of the table "subscriptions" */
  ["subscriptions_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: GraphQLTypes["subscriptions_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: GraphQLTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["subscriptions_stream_cursor_value_input"]: {
    assigned_chef?: GraphQLTypes["uuid"] | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    end_date?: GraphQLTypes["date"] | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    slot_id?: number | undefined;
    start_date?: GraphQLTypes["date"] | undefined;
    subscription_plan_id?: number | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    user_id?: GraphQLTypes["uuid"] | undefined;
  };
  /** aggregate sum on columns */
  ["subscriptions_sum_fields"]: {
    __typename: "subscriptions_sum_fields";
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** update columns of table "subscriptions" */
  ["subscriptions_update_column"]: subscriptions_update_column;
  ["subscriptions_updates"]: {
    /** increments the numeric columns with given value of the filtered values */
    _inc?: GraphQLTypes["subscriptions_inc_input"] | undefined;
    /** sets the columns of the filtered rows to the given values */
    _set?: GraphQLTypes["subscriptions_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: GraphQLTypes["subscriptions_bool_exp"];
  };
  /** aggregate var_pop on columns */
  ["subscriptions_var_pop_fields"]: {
    __typename: "subscriptions_var_pop_fields";
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** aggregate var_samp on columns */
  ["subscriptions_var_samp_fields"]: {
    __typename: "subscriptions_var_samp_fields";
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  /** aggregate variance on columns */
  ["subscriptions_variance_fields"]: {
    __typename: "subscriptions_variance_fields";
    slot_id?: number | undefined;
    subscription_plan_id?: number | undefined;
  };
  ["time"]: "scalar" & { name: "time" };
  /** Boolean expression to compare columns of type "time". All fields are combined with logical 'AND'. */
  ["time_comparison_exp"]: {
    _eq?: GraphQLTypes["time"] | undefined;
    _gt?: GraphQLTypes["time"] | undefined;
    _gte?: GraphQLTypes["time"] | undefined;
    _in?: Array<GraphQLTypes["time"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: GraphQLTypes["time"] | undefined;
    _lte?: GraphQLTypes["time"] | undefined;
    _neq?: GraphQLTypes["time"] | undefined;
    _nin?: Array<GraphQLTypes["time"]> | undefined;
  };
  ["timestamptz"]: "scalar" & { name: "timestamptz" };
  /** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
  ["timestamptz_comparison_exp"]: {
    _eq?: GraphQLTypes["timestamptz"] | undefined;
    _gt?: GraphQLTypes["timestamptz"] | undefined;
    _gte?: GraphQLTypes["timestamptz"] | undefined;
    _in?: Array<GraphQLTypes["timestamptz"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: GraphQLTypes["timestamptz"] | undefined;
    _lte?: GraphQLTypes["timestamptz"] | undefined;
    _neq?: GraphQLTypes["timestamptz"] | undefined;
    _nin?: Array<GraphQLTypes["timestamptz"]> | undefined;
  };
  ["timetz"]: "scalar" & { name: "timetz" };
  /** Boolean expression to compare columns of type "timetz". All fields are combined with logical 'AND'. */
  ["timetz_comparison_exp"]: {
    _eq?: GraphQLTypes["timetz"] | undefined;
    _gt?: GraphQLTypes["timetz"] | undefined;
    _gte?: GraphQLTypes["timetz"] | undefined;
    _in?: Array<GraphQLTypes["timetz"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: GraphQLTypes["timetz"] | undefined;
    _lte?: GraphQLTypes["timetz"] | undefined;
    _neq?: GraphQLTypes["timetz"] | undefined;
    _nin?: Array<GraphQLTypes["timetz"]> | undefined;
  };
  /** columns and relationships of "users" */
  ["users"]: {
    __typename: "users";
    address_city: string;
    address_line_1: string;
    address_line_2: string;
    address_pincode: string;
    address_state: string;
    created_at: GraphQLTypes["timestamptz"];
    email: string;
    id: GraphQLTypes["uuid"];
    is_chef: boolean;
    phone: string;
    updated_at: GraphQLTypes["timestamptz"];
    whatsapp: string;
  };
  /** aggregated selection of "users" */
  ["users_aggregate"]: {
    __typename: "users_aggregate";
    aggregate?: GraphQLTypes["users_aggregate_fields"] | undefined;
    nodes: Array<GraphQLTypes["users"]>;
  };
  /** aggregate fields of "users" */
  ["users_aggregate_fields"]: {
    __typename: "users_aggregate_fields";
    count: number;
    max?: GraphQLTypes["users_max_fields"] | undefined;
    min?: GraphQLTypes["users_min_fields"] | undefined;
  };
  /** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
  ["users_bool_exp"]: {
    _and?: Array<GraphQLTypes["users_bool_exp"]> | undefined;
    _not?: GraphQLTypes["users_bool_exp"] | undefined;
    _or?: Array<GraphQLTypes["users_bool_exp"]> | undefined;
    address_city?: GraphQLTypes["String_comparison_exp"] | undefined;
    address_line_1?: GraphQLTypes["String_comparison_exp"] | undefined;
    address_line_2?: GraphQLTypes["String_comparison_exp"] | undefined;
    address_pincode?: GraphQLTypes["String_comparison_exp"] | undefined;
    address_state?: GraphQLTypes["String_comparison_exp"] | undefined;
    created_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined;
    email?: GraphQLTypes["String_comparison_exp"] | undefined;
    id?: GraphQLTypes["uuid_comparison_exp"] | undefined;
    is_chef?: GraphQLTypes["Boolean_comparison_exp"] | undefined;
    phone?: GraphQLTypes["String_comparison_exp"] | undefined;
    updated_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined;
    whatsapp?: GraphQLTypes["String_comparison_exp"] | undefined;
  };
  /** unique or primary key constraints on table "users" */
  ["users_constraint"]: users_constraint;
  /** input type for inserting data into table "users" */
  ["users_insert_input"]: {
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    is_chef?: boolean | undefined;
    phone?: string | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  /** aggregate max on columns */
  ["users_max_fields"]: {
    __typename: "users_max_fields";
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    phone?: string | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  /** aggregate min on columns */
  ["users_min_fields"]: {
    __typename: "users_min_fields";
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    phone?: string | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  /** response of any mutation on the table "users" */
  ["users_mutation_response"]: {
    __typename: "users_mutation_response";
    /** number of rows affected by the mutation */
    affected_rows: number;
    /** data from the rows affected by the mutation */
    returning: Array<GraphQLTypes["users"]>;
  };
  /** on_conflict condition type for table "users" */
  ["users_on_conflict"]: {
    constraint: GraphQLTypes["users_constraint"];
    update_columns: Array<GraphQLTypes["users_update_column"]>;
    where?: GraphQLTypes["users_bool_exp"] | undefined;
  };
  /** Ordering options when selecting data from "users". */
  ["users_order_by"]: {
    address_city?: GraphQLTypes["order_by"] | undefined;
    address_line_1?: GraphQLTypes["order_by"] | undefined;
    address_line_2?: GraphQLTypes["order_by"] | undefined;
    address_pincode?: GraphQLTypes["order_by"] | undefined;
    address_state?: GraphQLTypes["order_by"] | undefined;
    created_at?: GraphQLTypes["order_by"] | undefined;
    email?: GraphQLTypes["order_by"] | undefined;
    id?: GraphQLTypes["order_by"] | undefined;
    is_chef?: GraphQLTypes["order_by"] | undefined;
    phone?: GraphQLTypes["order_by"] | undefined;
    updated_at?: GraphQLTypes["order_by"] | undefined;
    whatsapp?: GraphQLTypes["order_by"] | undefined;
  };
  /** primary key columns input for table: users */
  ["users_pk_columns_input"]: {
    id: GraphQLTypes["uuid"];
  };
  /** select columns of table "users" */
  ["users_select_column"]: users_select_column;
  /** input type for updating data in table "users" */
  ["users_set_input"]: {
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    is_chef?: boolean | undefined;
    phone?: string | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  /** Streaming cursor of the table "users" */
  ["users_stream_cursor_input"]: {
    /** Stream column input with initial value */
    initial_value: GraphQLTypes["users_stream_cursor_value_input"];
    /** cursor ordering */
    ordering?: GraphQLTypes["cursor_ordering"] | undefined;
  };
  /** Initial value of the column from where the streaming should start */
  ["users_stream_cursor_value_input"]: {
    address_city?: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    address_pincode?: string | undefined;
    address_state?: string | undefined;
    created_at?: GraphQLTypes["timestamptz"] | undefined;
    email?: string | undefined;
    id?: GraphQLTypes["uuid"] | undefined;
    is_chef?: boolean | undefined;
    phone?: string | undefined;
    updated_at?: GraphQLTypes["timestamptz"] | undefined;
    whatsapp?: string | undefined;
  };
  /** update columns of table "users" */
  ["users_update_column"]: users_update_column;
  ["users_updates"]: {
    /** sets the columns of the filtered rows to the given values */
    _set?: GraphQLTypes["users_set_input"] | undefined;
    /** filter the rows which have to be updated */
    where: GraphQLTypes["users_bool_exp"];
  };
  ["uuid"]: "scalar" & { name: "uuid" };
  /** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
  ["uuid_comparison_exp"]: {
    _eq?: GraphQLTypes["uuid"] | undefined;
    _gt?: GraphQLTypes["uuid"] | undefined;
    _gte?: GraphQLTypes["uuid"] | undefined;
    _in?: Array<GraphQLTypes["uuid"]> | undefined;
    _is_null?: boolean | undefined;
    _lt?: GraphQLTypes["uuid"] | undefined;
    _lte?: GraphQLTypes["uuid"] | undefined;
    _neq?: GraphQLTypes["uuid"] | undefined;
    _nin?: Array<GraphQLTypes["uuid"]> | undefined;
  };
};
/** ordering argument of a cursor */
export const enum cursor_ordering {
  ASC = "ASC",
  DESC = "DESC",
}
/** unique or primary key constraints on table "meals" */
export const enum meals_constraint {
  meals_pkey = "meals_pkey",
}
/** select columns of table "meals" */
export const enum meals_select_column {
  id = "id",
  name = "name",
  type = "type",
}
/** update columns of table "meals" */
export const enum meals_update_column {
  id = "id",
  name = "name",
  type = "type",
}
/** column ordering options */
export const enum order_by {
  asc = "asc",
  asc_nulls_first = "asc_nulls_first",
  asc_nulls_last = "asc_nulls_last",
  desc = "desc",
  desc_nulls_first = "desc_nulls_first",
  desc_nulls_last = "desc_nulls_last",
}
/** unique or primary key constraints on table "order_delivery_status" */
export const enum order_delivery_status_constraint {
  order_delivery_status_pkey = "order_delivery_status_pkey",
}
export const enum order_delivery_status_enum {
  chef_cancelled = "chef_cancelled",
  chef_confirmed = "chef_confirmed",
  delivered = "delivered",
  picked_up = "picked_up",
  preparing = "preparing",
  scheduled = "scheduled",
  user_cancelled = "user_cancelled",
}
/** select columns of table "order_delivery_status" */
export const enum order_delivery_status_select_column {
  value = "value",
}
/** update columns of table "order_delivery_status" */
export const enum order_delivery_status_update_column {
  value = "value",
}
/** unique or primary key constraints on table "orders" */
export const enum orders_constraint {
  orders_pkey = "orders_pkey",
}
/** select columns of table "orders" */
export const enum orders_select_column {
  created_at = "created_at",
  deliveredAt = "deliveredAt",
  delivery_date = "delivery_date",
  id = "id",
  meal_id = "meal_id",
  slot_id = "slot_id",
  status = "status",
  subscription_id = "subscription_id",
  updated_at = "updated_at",
}
/** update columns of table "orders" */
export const enum orders_update_column {
  created_at = "created_at",
  deliveredAt = "deliveredAt",
  delivery_date = "delivery_date",
  id = "id",
  meal_id = "meal_id",
  slot_id = "slot_id",
  status = "status",
  subscription_id = "subscription_id",
  updated_at = "updated_at",
}
/** unique or primary key constraints on table "slots" */
export const enum slots_constraint {
  slots_pkey = "slots_pkey",
}
/** select columns of table "slots" */
export const enum slots_select_column {
  from = "from",
  id = "id",
  to = "to",
  type = "type",
}
/** update columns of table "slots" */
export const enum slots_update_column {
  from = "from",
  id = "id",
  to = "to",
  type = "type",
}
/** unique or primary key constraints on table "subscription_plan_frequency" */
export const enum subscription_plan_frequency_constraint {
  subscription_plan_frequency_pkey = "subscription_plan_frequency_pkey",
}
export const enum subscription_plan_frequency_enum {
  monthly = "monthly",
  weekly = "weekly",
}
/** select columns of table "subscription_plan_frequency" */
export const enum subscription_plan_frequency_select_column {
  value = "value",
}
/** update columns of table "subscription_plan_frequency" */
export const enum subscription_plan_frequency_update_column {
  value = "value",
}
/** unique or primary key constraints on table "subscription_plan_type" */
export const enum subscription_plan_type_constraint {
  subscription_plan_type_pkey = "subscription_plan_type_pkey",
}
export const enum subscription_plan_type_enum {
  balanced = "balanced",
  high_protein = "high_protein",
}
/** select columns of table "subscription_plan_type" */
export const enum subscription_plan_type_select_column {
  value = "value",
}
/** update columns of table "subscription_plan_type" */
export const enum subscription_plan_type_update_column {
  value = "value",
}
/** unique or primary key constraints on table "subscription_plans" */
export const enum subscription_plans_constraint {
  subscription_plans_pkey = "subscription_plans_pkey",
}
/** select columns of table "subscription_plans" */
export const enum subscription_plans_select_column {
  frequency = "frequency",
  id = "id",
  is_non_veg = "is_non_veg",
  price = "price",
  type = "type",
}
/** select "subscription_plans_aggregate_bool_exp_bool_and_arguments_columns" columns of table "subscription_plans" */
export const enum subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns {
  is_non_veg = "is_non_veg",
}
/** select "subscription_plans_aggregate_bool_exp_bool_or_arguments_columns" columns of table "subscription_plans" */
export const enum subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns {
  is_non_veg = "is_non_veg",
}
/** update columns of table "subscription_plans" */
export const enum subscription_plans_update_column {
  frequency = "frequency",
  id = "id",
  is_non_veg = "is_non_veg",
  price = "price",
  type = "type",
}
/** unique or primary key constraints on table "subscriptions" */
export const enum subscriptions_constraint {
  subscriptions_pkey = "subscriptions_pkey",
}
/** select columns of table "subscriptions" */
export const enum subscriptions_select_column {
  assigned_chef = "assigned_chef",
  created_at = "created_at",
  end_date = "end_date",
  id = "id",
  slot_id = "slot_id",
  start_date = "start_date",
  subscription_plan_id = "subscription_plan_id",
  updated_at = "updated_at",
  user_id = "user_id",
}
/** update columns of table "subscriptions" */
export const enum subscriptions_update_column {
  assigned_chef = "assigned_chef",
  created_at = "created_at",
  end_date = "end_date",
  id = "id",
  slot_id = "slot_id",
  start_date = "start_date",
  subscription_plan_id = "subscription_plan_id",
  updated_at = "updated_at",
  user_id = "user_id",
}
/** unique or primary key constraints on table "users" */
export const enum users_constraint {
  users_email_key = "users_email_key",
  users_phone_key = "users_phone_key",
  users_pkey = "users_pkey",
}
/** select columns of table "users" */
export const enum users_select_column {
  address_city = "address_city",
  address_line_1 = "address_line_1",
  address_line_2 = "address_line_2",
  address_pincode = "address_pincode",
  address_state = "address_state",
  created_at = "created_at",
  email = "email",
  id = "id",
  is_chef = "is_chef",
  phone = "phone",
  updated_at = "updated_at",
  whatsapp = "whatsapp",
}
/** update columns of table "users" */
export const enum users_update_column {
  address_city = "address_city",
  address_line_1 = "address_line_1",
  address_line_2 = "address_line_2",
  address_pincode = "address_pincode",
  address_state = "address_state",
  created_at = "created_at",
  email = "email",
  id = "id",
  is_chef = "is_chef",
  phone = "phone",
  updated_at = "updated_at",
  whatsapp = "whatsapp",
}

type ZEUS_VARIABLES = {
  ["Boolean_comparison_exp"]: ValueTypes["Boolean_comparison_exp"];
  ["Int_comparison_exp"]: ValueTypes["Int_comparison_exp"];
  ["String_comparison_exp"]: ValueTypes["String_comparison_exp"];
  ["cursor_ordering"]: ValueTypes["cursor_ordering"];
  ["date"]: ValueTypes["date"];
  ["date_comparison_exp"]: ValueTypes["date_comparison_exp"];
  ["meals_bool_exp"]: ValueTypes["meals_bool_exp"];
  ["meals_constraint"]: ValueTypes["meals_constraint"];
  ["meals_inc_input"]: ValueTypes["meals_inc_input"];
  ["meals_insert_input"]: ValueTypes["meals_insert_input"];
  ["meals_on_conflict"]: ValueTypes["meals_on_conflict"];
  ["meals_order_by"]: ValueTypes["meals_order_by"];
  ["meals_pk_columns_input"]: ValueTypes["meals_pk_columns_input"];
  ["meals_select_column"]: ValueTypes["meals_select_column"];
  ["meals_set_input"]: ValueTypes["meals_set_input"];
  ["meals_stream_cursor_input"]: ValueTypes["meals_stream_cursor_input"];
  ["meals_stream_cursor_value_input"]: ValueTypes["meals_stream_cursor_value_input"];
  ["meals_update_column"]: ValueTypes["meals_update_column"];
  ["meals_updates"]: ValueTypes["meals_updates"];
  ["order_by"]: ValueTypes["order_by"];
  ["order_delivery_status_bool_exp"]: ValueTypes["order_delivery_status_bool_exp"];
  ["order_delivery_status_constraint"]: ValueTypes["order_delivery_status_constraint"];
  ["order_delivery_status_enum"]: ValueTypes["order_delivery_status_enum"];
  ["order_delivery_status_enum_comparison_exp"]: ValueTypes["order_delivery_status_enum_comparison_exp"];
  ["order_delivery_status_insert_input"]: ValueTypes["order_delivery_status_insert_input"];
  ["order_delivery_status_on_conflict"]: ValueTypes["order_delivery_status_on_conflict"];
  ["order_delivery_status_order_by"]: ValueTypes["order_delivery_status_order_by"];
  ["order_delivery_status_pk_columns_input"]: ValueTypes["order_delivery_status_pk_columns_input"];
  ["order_delivery_status_select_column"]: ValueTypes["order_delivery_status_select_column"];
  ["order_delivery_status_set_input"]: ValueTypes["order_delivery_status_set_input"];
  ["order_delivery_status_stream_cursor_input"]: ValueTypes["order_delivery_status_stream_cursor_input"];
  ["order_delivery_status_stream_cursor_value_input"]: ValueTypes["order_delivery_status_stream_cursor_value_input"];
  ["order_delivery_status_update_column"]: ValueTypes["order_delivery_status_update_column"];
  ["order_delivery_status_updates"]: ValueTypes["order_delivery_status_updates"];
  ["orders_bool_exp"]: ValueTypes["orders_bool_exp"];
  ["orders_constraint"]: ValueTypes["orders_constraint"];
  ["orders_inc_input"]: ValueTypes["orders_inc_input"];
  ["orders_insert_input"]: ValueTypes["orders_insert_input"];
  ["orders_on_conflict"]: ValueTypes["orders_on_conflict"];
  ["orders_order_by"]: ValueTypes["orders_order_by"];
  ["orders_pk_columns_input"]: ValueTypes["orders_pk_columns_input"];
  ["orders_select_column"]: ValueTypes["orders_select_column"];
  ["orders_set_input"]: ValueTypes["orders_set_input"];
  ["orders_stream_cursor_input"]: ValueTypes["orders_stream_cursor_input"];
  ["orders_stream_cursor_value_input"]: ValueTypes["orders_stream_cursor_value_input"];
  ["orders_update_column"]: ValueTypes["orders_update_column"];
  ["orders_updates"]: ValueTypes["orders_updates"];
  ["slots_bool_exp"]: ValueTypes["slots_bool_exp"];
  ["slots_constraint"]: ValueTypes["slots_constraint"];
  ["slots_inc_input"]: ValueTypes["slots_inc_input"];
  ["slots_insert_input"]: ValueTypes["slots_insert_input"];
  ["slots_on_conflict"]: ValueTypes["slots_on_conflict"];
  ["slots_order_by"]: ValueTypes["slots_order_by"];
  ["slots_pk_columns_input"]: ValueTypes["slots_pk_columns_input"];
  ["slots_select_column"]: ValueTypes["slots_select_column"];
  ["slots_set_input"]: ValueTypes["slots_set_input"];
  ["slots_stream_cursor_input"]: ValueTypes["slots_stream_cursor_input"];
  ["slots_stream_cursor_value_input"]: ValueTypes["slots_stream_cursor_value_input"];
  ["slots_update_column"]: ValueTypes["slots_update_column"];
  ["slots_updates"]: ValueTypes["slots_updates"];
  ["subscription_plan_frequency_bool_exp"]: ValueTypes["subscription_plan_frequency_bool_exp"];
  ["subscription_plan_frequency_constraint"]: ValueTypes["subscription_plan_frequency_constraint"];
  ["subscription_plan_frequency_enum"]: ValueTypes["subscription_plan_frequency_enum"];
  ["subscription_plan_frequency_enum_comparison_exp"]: ValueTypes["subscription_plan_frequency_enum_comparison_exp"];
  ["subscription_plan_frequency_insert_input"]: ValueTypes["subscription_plan_frequency_insert_input"];
  ["subscription_plan_frequency_obj_rel_insert_input"]: ValueTypes["subscription_plan_frequency_obj_rel_insert_input"];
  ["subscription_plan_frequency_on_conflict"]: ValueTypes["subscription_plan_frequency_on_conflict"];
  ["subscription_plan_frequency_order_by"]: ValueTypes["subscription_plan_frequency_order_by"];
  ["subscription_plan_frequency_pk_columns_input"]: ValueTypes["subscription_plan_frequency_pk_columns_input"];
  ["subscription_plan_frequency_select_column"]: ValueTypes["subscription_plan_frequency_select_column"];
  ["subscription_plan_frequency_set_input"]: ValueTypes["subscription_plan_frequency_set_input"];
  ["subscription_plan_frequency_stream_cursor_input"]: ValueTypes["subscription_plan_frequency_stream_cursor_input"];
  ["subscription_plan_frequency_stream_cursor_value_input"]: ValueTypes["subscription_plan_frequency_stream_cursor_value_input"];
  ["subscription_plan_frequency_update_column"]: ValueTypes["subscription_plan_frequency_update_column"];
  ["subscription_plan_frequency_updates"]: ValueTypes["subscription_plan_frequency_updates"];
  ["subscription_plan_type_bool_exp"]: ValueTypes["subscription_plan_type_bool_exp"];
  ["subscription_plan_type_constraint"]: ValueTypes["subscription_plan_type_constraint"];
  ["subscription_plan_type_enum"]: ValueTypes["subscription_plan_type_enum"];
  ["subscription_plan_type_enum_comparison_exp"]: ValueTypes["subscription_plan_type_enum_comparison_exp"];
  ["subscription_plan_type_insert_input"]: ValueTypes["subscription_plan_type_insert_input"];
  ["subscription_plan_type_obj_rel_insert_input"]: ValueTypes["subscription_plan_type_obj_rel_insert_input"];
  ["subscription_plan_type_on_conflict"]: ValueTypes["subscription_plan_type_on_conflict"];
  ["subscription_plan_type_order_by"]: ValueTypes["subscription_plan_type_order_by"];
  ["subscription_plan_type_pk_columns_input"]: ValueTypes["subscription_plan_type_pk_columns_input"];
  ["subscription_plan_type_select_column"]: ValueTypes["subscription_plan_type_select_column"];
  ["subscription_plan_type_set_input"]: ValueTypes["subscription_plan_type_set_input"];
  ["subscription_plan_type_stream_cursor_input"]: ValueTypes["subscription_plan_type_stream_cursor_input"];
  ["subscription_plan_type_stream_cursor_value_input"]: ValueTypes["subscription_plan_type_stream_cursor_value_input"];
  ["subscription_plan_type_update_column"]: ValueTypes["subscription_plan_type_update_column"];
  ["subscription_plan_type_updates"]: ValueTypes["subscription_plan_type_updates"];
  ["subscription_plans_aggregate_bool_exp"]: ValueTypes["subscription_plans_aggregate_bool_exp"];
  ["subscription_plans_aggregate_bool_exp_bool_and"]: ValueTypes["subscription_plans_aggregate_bool_exp_bool_and"];
  ["subscription_plans_aggregate_bool_exp_bool_or"]: ValueTypes["subscription_plans_aggregate_bool_exp_bool_or"];
  ["subscription_plans_aggregate_bool_exp_count"]: ValueTypes["subscription_plans_aggregate_bool_exp_count"];
  ["subscription_plans_aggregate_order_by"]: ValueTypes["subscription_plans_aggregate_order_by"];
  ["subscription_plans_arr_rel_insert_input"]: ValueTypes["subscription_plans_arr_rel_insert_input"];
  ["subscription_plans_avg_order_by"]: ValueTypes["subscription_plans_avg_order_by"];
  ["subscription_plans_bool_exp"]: ValueTypes["subscription_plans_bool_exp"];
  ["subscription_plans_constraint"]: ValueTypes["subscription_plans_constraint"];
  ["subscription_plans_inc_input"]: ValueTypes["subscription_plans_inc_input"];
  ["subscription_plans_insert_input"]: ValueTypes["subscription_plans_insert_input"];
  ["subscription_plans_max_order_by"]: ValueTypes["subscription_plans_max_order_by"];
  ["subscription_plans_min_order_by"]: ValueTypes["subscription_plans_min_order_by"];
  ["subscription_plans_on_conflict"]: ValueTypes["subscription_plans_on_conflict"];
  ["subscription_plans_order_by"]: ValueTypes["subscription_plans_order_by"];
  ["subscription_plans_pk_columns_input"]: ValueTypes["subscription_plans_pk_columns_input"];
  ["subscription_plans_select_column"]: ValueTypes["subscription_plans_select_column"];
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"]: ValueTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_and_arguments_columns"];
  ["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"]: ValueTypes["subscription_plans_select_column_subscription_plans_aggregate_bool_exp_bool_or_arguments_columns"];
  ["subscription_plans_set_input"]: ValueTypes["subscription_plans_set_input"];
  ["subscription_plans_stddev_order_by"]: ValueTypes["subscription_plans_stddev_order_by"];
  ["subscription_plans_stddev_pop_order_by"]: ValueTypes["subscription_plans_stddev_pop_order_by"];
  ["subscription_plans_stddev_samp_order_by"]: ValueTypes["subscription_plans_stddev_samp_order_by"];
  ["subscription_plans_stream_cursor_input"]: ValueTypes["subscription_plans_stream_cursor_input"];
  ["subscription_plans_stream_cursor_value_input"]: ValueTypes["subscription_plans_stream_cursor_value_input"];
  ["subscription_plans_sum_order_by"]: ValueTypes["subscription_plans_sum_order_by"];
  ["subscription_plans_update_column"]: ValueTypes["subscription_plans_update_column"];
  ["subscription_plans_updates"]: ValueTypes["subscription_plans_updates"];
  ["subscription_plans_var_pop_order_by"]: ValueTypes["subscription_plans_var_pop_order_by"];
  ["subscription_plans_var_samp_order_by"]: ValueTypes["subscription_plans_var_samp_order_by"];
  ["subscription_plans_variance_order_by"]: ValueTypes["subscription_plans_variance_order_by"];
  ["subscriptions_bool_exp"]: ValueTypes["subscriptions_bool_exp"];
  ["subscriptions_constraint"]: ValueTypes["subscriptions_constraint"];
  ["subscriptions_inc_input"]: ValueTypes["subscriptions_inc_input"];
  ["subscriptions_insert_input"]: ValueTypes["subscriptions_insert_input"];
  ["subscriptions_on_conflict"]: ValueTypes["subscriptions_on_conflict"];
  ["subscriptions_order_by"]: ValueTypes["subscriptions_order_by"];
  ["subscriptions_pk_columns_input"]: ValueTypes["subscriptions_pk_columns_input"];
  ["subscriptions_select_column"]: ValueTypes["subscriptions_select_column"];
  ["subscriptions_set_input"]: ValueTypes["subscriptions_set_input"];
  ["subscriptions_stream_cursor_input"]: ValueTypes["subscriptions_stream_cursor_input"];
  ["subscriptions_stream_cursor_value_input"]: ValueTypes["subscriptions_stream_cursor_value_input"];
  ["subscriptions_update_column"]: ValueTypes["subscriptions_update_column"];
  ["subscriptions_updates"]: ValueTypes["subscriptions_updates"];
  ["time"]: ValueTypes["time"];
  ["time_comparison_exp"]: ValueTypes["time_comparison_exp"];
  ["timestamptz"]: ValueTypes["timestamptz"];
  ["timestamptz_comparison_exp"]: ValueTypes["timestamptz_comparison_exp"];
  ["timetz"]: ValueTypes["timetz"];
  ["timetz_comparison_exp"]: ValueTypes["timetz_comparison_exp"];
  ["users_bool_exp"]: ValueTypes["users_bool_exp"];
  ["users_constraint"]: ValueTypes["users_constraint"];
  ["users_insert_input"]: ValueTypes["users_insert_input"];
  ["users_on_conflict"]: ValueTypes["users_on_conflict"];
  ["users_order_by"]: ValueTypes["users_order_by"];
  ["users_pk_columns_input"]: ValueTypes["users_pk_columns_input"];
  ["users_select_column"]: ValueTypes["users_select_column"];
  ["users_set_input"]: ValueTypes["users_set_input"];
  ["users_stream_cursor_input"]: ValueTypes["users_stream_cursor_input"];
  ["users_stream_cursor_value_input"]: ValueTypes["users_stream_cursor_value_input"];
  ["users_update_column"]: ValueTypes["users_update_column"];
  ["users_updates"]: ValueTypes["users_updates"];
  ["uuid"]: ValueTypes["uuid"];
  ["uuid_comparison_exp"]: ValueTypes["uuid_comparison_exp"];
};
