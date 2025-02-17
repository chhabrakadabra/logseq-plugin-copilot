# Logseq Copilot

Talk to AI about your Logseq notes.

## Features

![demo](./demo.gif)

Logseq Copilot automatically indexes all your Logseq notes and includes relevant context in the
ChatGPT prompt. It doesn't matter which page you're currently on, this plugin will pull relevant
information from all of your notes.

Using a chat-like interface, you'll be able to discuss your notes with a Copilot and easily insert
note suggestions into Logseq.

## Usage

Be sure to add your OpenAI API key to the [settings](#settings) page. Without it, this plugin is not
going to work.

Use `ctrl-P` to bring up the Copilot interface and type in a question about your notes.

## Settings

![settings](./settings.png)

- **OpenAI API Key**: If you don't have one already, create it
  [here](https://platform.openai.com/settings/organization/api-keys)
- **OpenAI Base URL**: If you have a proxy you'd like your OpenAI API calls to go through. If you
  don't know what that is, then you can leave this blank.
- **OpenAI Model**: The actual model the plugin will contact.
- **Chat Dialog Shortcut**: The keyboard shortcut to bring up the chat dialog screen.
- **Vector Similarity Top K**: (Advanced) The number of vector search results that can be included
  in your prompt context.

## Support

Create an issue [here](https://github.com/chhabrakadabra/logseq-plugin-copilot/issues). Even better,
create a pull request!

## FAQ

### Can this plugin work with locally hosted LLMs?

Sure! As long as you can expose an OpenAI compatible API. For example, to work with
[Ollama](https://ollama.com/), you'll need to change the `OpenAI Base URL` setting to
`http://localhost:11434/v1`. You'll also need to
[adjust](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server)
the [OLLAMA_ORIGINS environment
variable](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-allow-additional-web-origins-to-access-ollama).
You'll need to allow the origin `logseq.io` or just set it to a wildcard `*` if it's appropriate.

## License

MIT License
