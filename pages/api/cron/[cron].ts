import { NextApiResponse } from "next";
import { NextRequest } from "next/server";

export default function (req: NextRequest, res: NextApiResponse) {
  const token = req.headers["authorization"].replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET)
    return res.status(400).send("unauthorized");
  const cronName = req.url.split("/")[3];

  res.status(200).send(cronName);
}
