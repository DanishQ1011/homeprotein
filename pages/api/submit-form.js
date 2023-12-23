

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const formData = req.body;

    // Replace 'your-email@gmail.com' with the destination email address
    const toEmail = 'shah.official1011@gmail.com';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'shah.official1011@gmail.com',
        pass: 'zhin urbv jdwp bvcv'
      }
    });

    const mailOptions = {
      from: 'shah.official1011@gmail.com',
      to: toEmail,
      subject: 'New Form Submission',
      text: JSON.stringify(formData, null, 2)
    };

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Form submitted successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}

// import { transporter, mailOptions } from "../../config/nodemailer";

// const handler = async (req, res) => {
//     if (req.method === "POST"){
//         const reqPayload = req?.body;

//         console.log('Req Payload: ', reqPayload)
    
//         return res.json({ reqPayload });
//     }

//     try {
//         await transporter.sendMail({
//             ...mailOptions,
//             subject: data.subject,
//             text: "This is a test String",
//             html: "<h1>Test Title</h1><p>Some body text</p>"
//         });
        
//         return res.status(200).json({ success: true });

//     } catch (error) {
//         console.log("Error: ", error)
//         return res.status(400).json({
//             message: error.message
//         });

//     }

//     return res.status(400).json({
//         msg: "This needs to be a post request"
//     });
// }

// export default handler;
