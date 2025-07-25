import { consoleError } from '@onflow/frw-shared/utils';

import Message from './index';

class PortMessage extends Message {
  port: chrome.runtime.Port | null = null;

  constructor(port?: chrome.runtime.Port) {
    super();

    if (port) {
      this.port = port;
    }
  }

  connect = (name?: string) => {
    this.port = chrome.runtime.connect('', name ? { name } : undefined);
    this.port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this._EVENT_PRE}message`) {
        this.emit('message', data);
        return;
      }

      if (_type_ === `${this._EVENT_PRE}response`) {
        this.onResponse(data);
      }
    });

    this.port.onDisconnect.addListener(() => this.connect(name));
    return this;
  };

  listen = (listenCallback: (data: any) => void) => {
    if (!this.port) return;
    this.listenCallback = listenCallback;
    this.port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this._EVENT_PRE}request`) {
        this.onRequest(data);
      }
    });
    return this;
  };

  send = (type: string, data: any) => {
    if (!this.port) return;
    try {
      this.port.postMessage({ _type_: `${this._EVENT_PRE}${type}`, data });
    } catch (e) {
      // DO NOTHING BUT CATCH THIS ERROR
      consoleError('PortMessage error: ', e);
    }
  };

  dispose = () => {
    this._dispose();
    this.port?.disconnect();
  };
}

export default PortMessage;
