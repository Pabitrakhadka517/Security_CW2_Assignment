import Joi from 'joi';

export const initiateEsewaPaymentSchema = {
  body: Joi.object({
    orderId: Joi.string().required(),
  }),
};

// eSewa's redirect back to success_url/failure_url. `data` is only present
// on success_url; failure_url gets the transaction_uuid we appended
// ourselves (see payment.service#initiateEsewaPayment). Both optional here —
// the service treats a missing/undecodable payload as a failed payment
// rather than rejecting the request outright, since eSewa itself is the one
// calling this endpoint and a 400 would just show the shopper a broken page.
export const esewaCallbackSchema = {
  query: Joi.object({
    data: Joi.string().optional(),
    transaction_uuid: Joi.string().optional(),
  }).unknown(true),
};
