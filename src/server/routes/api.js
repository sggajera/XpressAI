// Add these routes
router.post('/twitter/approved-replies', async (req, res) => {
  try {
    const result = await twitter.storeApprovedReply(req.body.tweetId, req.body.reply);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/twitter/approved-replies', async (req, res) => {
  try {
    const replies = await twitter.getApprovedReplies();
    res.json({ success: true, data: replies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); 