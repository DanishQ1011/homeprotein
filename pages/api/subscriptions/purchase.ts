import { getNext30DatesExcludingSundays } from "../../../src/utils/date";
import zeusChain from "../../../src/lib/zeus";
import { WhatsappHandler } from "@/utils/whatsapp-handler";
import { NextApiRequest, NextApiResponse } from "next";
import {
  ValueTypes,
  order_delivery_status_enum,
} from "../../../generated/zeus";

const util = require("util");
const ADMIN_SECRET = "homeProtein@98_90";
const vegMealIds = [1, 2, 4, 5, 6, 7];
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(
    util.inspect(req.body, { showHidden: false, depth: null, colors: true })
  );
  const { planId, slotId, startDate, adminSecret } = req.body;

  console.log({ slotId });

  if (adminSecret !== ADMIN_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  //   return res.send(next30Days);
  const subscription = await zeusChain("mutation")({
    insert_subscriptions_one: [
      {
        object: {
          start_date: startDate,
          end_date: "2024-06-09",
          slot_id: Number(slotId),
          subscription_plan_id: Number(planId),
          user_id: "a73c2b5c-ad05-4c89-8142-c86b62530545",
        },
      },
      {
        created_at: true,
        id: true,
      },
    ],
  });

  const next30Days = getNext30DatesExcludingSundays(startDate);

  const orders: ValueTypes["orders_insert_input"][] = next30Days.map(
    (date, i) => ({
      slot_id: slotId,
      status: order_delivery_status_enum.scheduled,
      delivery_date: date,
      meal_id: vegMealIds[i % vegMealIds.length],
      subscription_id: subscription.insert_subscriptions_one.id,
    })
  );
  //   console.log({ orders });

  try {
    const insertedOrders = await zeusChain("mutation")({
      insert_orders: [
        {
          objects: orders,
        },
        {
          affected_rows: true,
        },
      ],
    });

    res.status(200).send({
      subscription: subscription?.insert_subscriptions_one,
      insertedOrders: insertedOrders.insert_orders.affected_rows,
    });
  } catch (error) {
    console.log(
      util.inspect(error.response, {
        showHidden: false,
        depth: null,
        colors: true,
      })
    );
    console.log(error.response.errors[0]);
  }
}
