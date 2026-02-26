import { appFromConfig } from '../../utils/appFromConfig';

export default appFromConfig({
    hostname: ['local.com', 'local.dev'],
    get: {
        '/': (_req, res) => {
            res.send('local com ONLY!');
        },
    },
});
