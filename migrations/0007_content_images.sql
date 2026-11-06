-- Fill reviewed covers only. Preserve custom covers and repurposed items.
-- Requires 0006_content_refresh.sql; never replace rows or interaction data.

UPDATE items SET cover='/images/covers/atomic-habits-fac65ccd1dee.webp', updated_at=unixepoch() WHERE id='atomic-habits' AND title='掌控习惯' AND category='health' AND cover='';

UPDATE items SET cover='/images/covers/bilibili-839b41725a9b.webp', updated_at=unixepoch() WHERE id='bilibili' AND title='哔哩哔哩' AND category='video' AND cover='';

UPDATE items SET cover='/images/covers/blender-b662d42849bf.webp', updated_at=unixepoch() WHERE id='blender' AND title='Blender' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/bolt-d48c56a4f2ee.webp', updated_at=unixepoch() WHERE id='bolt' AND title='Bolt.new' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/chatgpt-e618143eb6d0.webp', updated_at=unixepoch() WHERE id='chatgpt' AND title='ChatGPT' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/claude-ai-f7898ec59478.webp', updated_at=unixepoch() WHERE id='claude-ai' AND title='Claude' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/claude-code-d249a621d44d.webp', updated_at=unixepoch() WHERE id='claude-code' AND title='Claude Code' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/creator-andrej-5872fc7f1f08.webp', updated_at=unixepoch() WHERE id='creator-andrej' AND title='Andrej Karpathy' AND category='creator' AND cover='';

UPDATE items SET cover='/images/covers/creator-ruanyifeng-584a48c29c59.webp', updated_at=unixepoch() WHERE id='creator-ruanyifeng' AND title='阮一峰' AND category='creator' AND cover='';

UPDATE items SET cover='/images/covers/cursor-abd2cfb004d0.webp', updated_at=unixepoch() WHERE id='cursor' AND title='Cursor' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/deepseek-104a63821597.webp', updated_at=unixepoch() WHERE id='deepseek' AND title='DeepSeek' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/discord-c7d4f313404e.webp', updated_at=unixepoch() WHERE id='discord' AND title='Discord' AND category='communication' AND cover='';

UPDATE items SET cover='/images/covers/doubao-adf9d3c7dc9d.webp', updated_at=unixepoch() WHERE id='doubao' AND title='豆包' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/elevenlabs-3a155e0bd7ed.webp', updated_at=unixepoch() WHERE id='elevenlabs' AND title='ElevenLabs' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/excalidraw-4d4c81829325.webp', updated_at=unixepoch() WHERE id='excalidraw' AND title='Excalidraw' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/fight-club-1c4f8359429e.webp', updated_at=unixepoch() WHERE id='fight-club' AND title='搏击俱乐部' AND category='film' AND cover='';

UPDATE items SET cover='/images/covers/freecodecamp-f4aa168ca79d.webp', updated_at=unixepoch() WHERE id='freecodecamp' AND title='freeCodeCamp' AND category='other' AND cover='';

UPDATE items SET cover='/images/covers/fujifilm-x100vi-ccff8c3b6c05.webp', updated_at=unixepoch() WHERE id='fujifilm-x100vi' AND title='富士 X100VI' AND category='camera' AND cover='';

UPDATE items SET cover='/images/covers/gemini-583a981f4194.webp', updated_at=unixepoch() WHERE id='gemini' AND title='Gemini' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/github-copilot-7702662a7363.webp', updated_at=unixepoch() WHERE id='github-copilot' AND title='GitHub Copilot' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/godot-4fe8dd17416c.webp', updated_at=unixepoch() WHERE id='godot' AND title='Godot Engine' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/grok-aaa03a1df4cb.webp', updated_at=unixepoch() WHERE id='grok' AND title='Grok' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/headspace-bfd0ab5ed867.webp', updated_at=unixepoch() WHERE id='headspace' AND title='潮汐' AND category='health' AND cover='';

UPDATE items SET cover='/images/covers/ideogram-ffab5cb75f8d.webp', updated_at=unixepoch() WHERE id='ideogram' AND title='Ideogram' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/instagram-ba763550de60.webp', updated_at=unixepoch() WHERE id='instagram' AND title='Instagram' AND category='social' AND cover='';

UPDATE items SET cover='/images/covers/interstellar-a5e4d7256ca2.webp', updated_at=unixepoch() WHERE id='interstellar' AND title='星际穿越' AND category='film' AND cover='';

UPDATE items SET cover='/images/covers/keep-b40762594d11.webp', updated_at=unixepoch() WHERE id='keep' AND title='Keep' AND category='health' AND cover='';

UPDATE items SET cover='/images/covers/kimi-84a2b8810c46.webp', updated_at=unixepoch() WHERE id='kimi' AND title='Kimi' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/kling-583654106ff5.webp', updated_at=unixepoch() WHERE id='kling' AND title='可灵 Kling' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/localsend-09c299198aed.webp', updated_at=unixepoch() WHERE id='localsend' AND title='LocalSend' AND category='communication' AND cover='';

UPDATE items SET cover='/images/covers/lovable-7567f6142645.webp', updated_at=unixepoch() WHERE id='lovable' AND title='Lovable' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/midjourney-66460d7c1049.webp', updated_at=unixepoch() WHERE id='midjourney' AND title='Midjourney' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/notion-ai-31f48dd2cced.webp', updated_at=unixepoch() WHERE id='notion-ai' AND title='Notion AI' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/obsidian-191a999538ee.webp', updated_at=unixepoch() WHERE id='obsidian' AND title='Obsidian' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/parasite-a4d6f5123dfb.webp', updated_at=unixepoch() WHERE id='parasite' AND title='寄生虫' AND category='film' AND cover='';

UPDATE items SET cover='/images/covers/perplexity-e7bd145deecb.webp', updated_at=unixepoch() WHERE id='perplexity' AND title='Perplexity' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/pika-395f12b48607.webp', updated_at=unixepoch() WHERE id='pika' AND title='Pika' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/podcast-hardwork-1c79ea24606b.webp', updated_at=unixepoch() WHERE id='podcast-hardwork' AND title='硬地骇客' AND category='podcast' AND cover='';

UPDATE items SET cover='/images/covers/podcast-lex-a0e48bcf509b.webp', updated_at=unixepoch() WHERE id='podcast-lex' AND title='Lex Fridman Podcast' AND category='podcast' AND cover='';

UPDATE items SET cover='/images/covers/quiet-02ee55263c23.webp', updated_at=unixepoch() WHERE id='quiet' AND title='安静：内向者的力量' AND category='book' AND cover='';

UPDATE items SET cover='/images/covers/qwen-5d5596725b65.webp', updated_at=unixepoch() WHERE id='qwen' AND title='Qwen / 千问' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/runway-5b54a30d8af1.webp', updated_at=unixepoch() WHERE id='runway' AND title='Runway' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/sapiens-71fdc7290dd3.webp', updated_at=unixepoch() WHERE id='sapiens' AND title='人类简史' AND category='book' AND cover='';

UPDATE items SET cover='/images/covers/shawshank-2a51094c5fb9.webp', updated_at=unixepoch() WHERE id='shawshank' AND title='肖申克的救赎' AND category='film' AND cover='';

UPDATE items SET cover='/images/covers/social-network-33377c909860.webp', updated_at=unixepoch() WHERE id='social-network' AND title='社交网络' AND category='film' AND cover='';

UPDATE items SET cover='/images/covers/spirited-away-35c0166b2947.webp', updated_at=unixepoch() WHERE id='spirited-away' AND title='千与千寻' AND category='film' AND cover='';

UPDATE items SET cover='/images/covers/stable-diffusion-8dc0b465b84b.webp', updated_at=unixepoch() WHERE id='stable-diffusion' AND title='ComfyUI / Stable Diffusion 工作流' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/suno-2bfe01a9219c.webp', updated_at=unixepoch() WHERE id='suno' AND title='Suno' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/telegram-89ecb8f96f4c.webp', updated_at=unixepoch() WHERE id='telegram' AND title='Telegram' AND category='communication' AND cover='';

UPDATE items SET cover='/images/covers/tesla-model3-7383a411838f.webp', updated_at=unixepoch() WHERE id='tesla-model3' AND title='特斯拉 Model 3' AND category='car' AND cover='';

UPDATE items SET cover='/images/covers/the-almanack-of-naval-b7c0acdd67c5.webp', updated_at=unixepoch() WHERE id='the-almanack-of-naval' AND title='纳瓦尔宝典' AND category='book' AND cover='';

UPDATE items SET cover='/images/covers/thinking-fast-slow-ad9f5873a361.webp', updated_at=unixepoch() WHERE id='thinking-fast-slow' AND title='思考，快与慢' AND category='book' AND cover='';

UPDATE items SET cover='/images/covers/v0-244ef182313b.webp', updated_at=unixepoch() WHERE id='v0' AND title='v0' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/visual-studio-code-33ab8aa5b942.webp', updated_at=unixepoch() WHERE id='visual-studio-code' AND title='Visual Studio Code' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/why-we-sleep-54f2acb48ab4.webp', updated_at=unixepoch() WHERE id='why-we-sleep' AND title='为什么我们要睡觉' AND category='health' AND cover='';

UPDATE items SET cover='/images/covers/windsurf-7dc81b4c1102.webp', updated_at=unixepoch() WHERE id='windsurf' AND title='Windsurf / Devin Desktop' AND category='tool' AND cover='';

UPDATE items SET cover='/images/covers/xiaohongshu-ad0f72fd255c.webp', updated_at=unixepoch() WHERE id='xiaohongshu' AND title='小红书' AND category='social' AND cover='';

UPDATE items SET cover='/images/covers/youtube-d94bc65a1a11.webp', updated_at=unixepoch() WHERE id='youtube' AND title='YouTube' AND category='video' AND cover='';

UPDATE items SET cover='/images/covers/zishishinei-6210221f0bd3.webp', updated_at=unixepoch() WHERE id='zishishinei' AND title='置身事内' AND category='book' AND cover='';

UPDATE items SET cover='/images/covers/zotero-8980445b7153.webp', updated_at=unixepoch() WHERE id='zotero' AND title='Zotero' AND category='tool' AND cover='';
