import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { loadDocument } from '../shared/document.js';

const AssistantContext = createContext();
export const AssistantProvider = AssistantContext.Provider;

export function useAssistantConfig() {
  const { assistantConfig, setAssistantConfig } = useContext(AssistantContext);
  return { config: assistantConfig, setConfig: setAssistantConfig };
}

export function useAssistantActions() {
  const { config: { origin, fields } } = useAssistantConfig();
  const sendCommand = async (command, prompt) => {
    // load document
    const urlsArray = fields['import-url'].split('\n').reverse().filter((u) => u.trim() !== '');

    const url = urlsArray.pop();
    const res = await loadDocument(url, {
      origin,
      headers: fields['import-custom-headers'],
      enableJs: fields['import-enable-js'],
      scrollToBottom: fields['import-scroll-to-bottom'],
      pageLoadTimeout: fields['import-pageload-timeout'],
    });

    console.log(res.document);

    // create an import builder factory

    // set up event listeners

    // send the command
  };

  return {
    sendCommand,
  };
}
