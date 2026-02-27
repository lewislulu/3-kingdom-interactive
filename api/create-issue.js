/**
 * Vercel Serverless Function -- Create GitHub Issue
 *
 * POST /api/create-issue
 * Body: { title: string, body: string, labels?: string[] }
 *
 * Requires environment variable:
 *   GITHUB_TOKEN  -- Personal Access Token with `repo` scope
 *
 * The target repo is configured via:
 *   GITHUB_OWNER  -- e.g. "lewis"
 *   GITHUB_REPO   -- e.g. "vis_中国近代史"
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Server misconfigured: missing GitHub env vars' });
  }

  const { title, body, labels } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body || '',
          labels: labels || ['feedback'],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: 'GitHub API error',
        detail: errorData.message || response.statusText,
      });
    }

    const issue = await response.json();
    return res.status(201).json({
      success: true,
      issueNumber: issue.number,
      url: issue.html_url,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
