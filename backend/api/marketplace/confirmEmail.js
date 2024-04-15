import { Router } from 'express';
import sgMail from '@sendgrid/mail';
import auth from "../../middleware/auth.js";

const router = Router();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email sending route
router.post('/', auth, async (req, res) => {
  const { to, from, templateId, dynamicTemplateData, cc } = req.body;

  const msg = {
    to,
    from,
    templateId,
    dynamicTemplateData,
    cc
  };

  try {
    await sgMail.send(msg);
    res.status(200).send({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send({ error: 'Failed to send email', details: error.message });
  }
});

export default router;
