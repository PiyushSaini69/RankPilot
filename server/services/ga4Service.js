import { google } from 'googleapis';
import { getValidGoogleToken } from './googleAuthService.js';

export const listProperties = async (userId, tokenId = null) => {
    const auth = await getValidGoogleToken(userId, tokenId);
    const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth });

    const res = await analyticsadmin.accountSummaries.list();
    const properties = [];
    if (res.data.accountSummaries) {
        for (const account of res.data.accountSummaries) {
            if (account.propertySummaries) {
                for (const prop of account.propertySummaries) {
                    properties.push({ id: prop.property, name: prop.displayName, accountId: account.account });
                }
            }
        }
    }

    // Fetch website URL for each property in parallel using Promise.all
    if (properties.length > 0) {
        await Promise.all(properties.map(async (prop) => {
            try {
                const streamsRes = await analyticsadmin.properties.dataStreams.list({ parent: prop.id });
                if (streamsRes.data.dataStreams && streamsRes.data.dataStreams.length > 0) {
                    const webStream = streamsRes.data.dataStreams.find(s => s.type === 'WEB_DATA_STREAM');
                    if (webStream && webStream.webStreamData && webStream.webStreamData.defaultUri) {
                        prop.websiteUrl = webStream.webStreamData.defaultUri;
                    }
                }
            } catch (error) {
                console.error('Error fetching data streams for property:', prop.id, error.message);
            }
        }));
    }

    return properties;
};

// Implements other ga4 queries...
export const runReport = async (userId, propertyId, reportType, startDate, endDate, dimensions, metrics, tokenId = null) => {
    if (!propertyId) throw new Error('GA4_PROPERTY_ID_MISSING');

    const auth = await getValidGoogleToken(userId, tokenId);
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });

    let allRows = [];
    let offset = 0;
    const limit = 50000;

    while (true) {
        const res = await analyticsdata.properties.runReport({
            property: propertyId,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: dimensions.map(d => ({ name: d })),
                metrics: metrics.map(m => ({ name: m })),
                limit: limit,
                offset: offset
            }
        });

        const rows = res.data.rows || [];
        allRows = allRows.concat(rows);

        if (rows.length < limit || allRows.length >= 500000) {
            break;
        }

        offset += limit;
    }

    return { rows: allRows };
};
