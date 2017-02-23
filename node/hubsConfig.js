/*
 * This file contains all the supported hubs. As hubs are configured and ready
 * to be used, this file should be updated.
 */

var hubs = [
    {
        'id': "winkHub",
        'name': 'Wink',
        'translator': 'opent2t-translator-com-wink-hub'
    },
    {
        'id': "insteonHub",
        'name': 'Insteon',
        'translator': 'opent2t-translator-com-insteon-hub'
    },
    {
        'id': "nestHub",
        'name': 'Nest',
        'translator': 'opent2t-translator-com-nest-hub'
    },
    {
        'id': "smartthingsHub",
        'name': 'SmartThings',
        'translator': 'opent2t-translator-com-smartthings-hub'
    },
    {
        'id': "hueHub",
        'name': 'Hue',
        'translator': 'opent2t-translator-com-hue-hub'
    }
];

module.exports = {
    hubs: hubs
};
