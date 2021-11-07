import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect } from 'react';

const Home: NextPage<{ path: string; data?: any; error?: { type: string; description?: string } }> = ({
    path,
    data,
    error,
}) => {
    const redirect = `https://dashboard.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_STRIPE_OAUTH_CLIENT_ID}&scope=read_write&redirect_uri=${process.env.NEXT_PUBLIC_BASE_URL}${path}`;

    const router = useRouter();

    useEffect(() => {
        router.replace(path, undefined, { shallow: true });
    }, []);

    return (
        <div>
            <Head>
                <title>Stripe Connect Marketplace</title>
                <meta name="description" content="Stripe connect marketplace sample app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div>
                <a href={redirect}>Connect to stripe</a>
            </div>

            {error && (
                <div>
                    <h3>{error.type}</h3>
                    <p>{error.description}</p>
                </div>
            )}

            {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
    let path = (req.url || '').split('?')[0];

    path = path === '/' ? '' : path;

    let props: any = {
        path,
        error: null,
    };

    // handle if an error occurred when redirecting from stripe
    if (query['error']) {
        props = {
            ...props,
            error: { type: query['error'] as string, description: query['error_description'] as string },
        };
    }

    // handle if connection to stripe account was successful
    if (query['code']) {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe/connect/verify`, {
                method: 'POST',
                body: JSON.stringify({ code: query['code'], scope: query['scope'] }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            props = { ...props, data };
        } catch (error) {
            props = { ...props, data: { error } };
        }
    }

    return {
        props,
    };
};

export default Home;
