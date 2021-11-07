import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import handleErrors from '../../../../utils/middleware/handle-error';
import createError from '../../../../utils/create-error';
import { Stripe } from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2020-08-27',
});

const handler: NextApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const body = req.body;

    switch (req.method) {
        case 'POST':
            const result = await stripe.oauth
                .token({
                    grant_type: 'authorization_code',
                    code: body?.code,
                })
                .catch((err: unknown) => {
                    throw createError(400, `${(err as any)?.message}`);
                });

            const account = await stripe.accounts?.retrieve(result?.stripe_user_id as string)?.catch((err) => {
                throw createError(400, `${err?.message}`);
            });

            const accountAnalysis = {
                hasConnectedAccount: !!account?.id, // Check if account ID received is actually connected or exists.
                accountId: account?.id,
                hasCompletedProcess: account?.details_submitted,
                isValid: account?.charges_enabled && account?.payouts_enabled,
                displayName: account?.settings?.dashboard?.display_name || null,
                country: account?.country,
                currency: account?.default_currency,
            };

            // boolean - Once the account is connected, should we let it unlink?
            const shouldAllowUnlink =
                accountAnalysis?.hasConnectedAccount &&
                (!accountAnalysis?.isValid || !accountAnalysis?.hasCompletedProcess || !accountAnalysis?.displayName);

            res.status(200).json({ account, oauth: result, accountAnalysis, shouldAllowUnlink });
            break;

        default:
            throw createError(405, 'Method Not Allowed');
    }
};

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};

export default handleErrors(handler);
