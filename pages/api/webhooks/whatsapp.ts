import { WhatsappHandler } from "@/utils/whatsapp-handler";
import { NextApiRequest, NextApiResponse } from "next";

const util = require("util");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(
    util.inspect(req.body, { showHidden: false, depth: null, colors: true })
  );
  const message = new WhatsappHandler(req.body);
  console.log({
    buttonReply: message?.newMessage?.button,
  });

  console.log(req.body);
  res.status(200).send(req.body["hub.challenge"] || req.query["hub.challenge"]);
}
