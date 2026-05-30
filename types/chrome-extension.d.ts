declare namespace chrome {
  interface ChromeEvent<T extends (...args: any[]) => void> {
    addListener(callback: T): void;
    removeListener(callback: T): void;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      windowId?: number;
    }

    interface TabActiveInfo {
      tabId: number;
      windowId: number;
    }

    interface TabChangeInfo {
      url?: string;
      status?: string;
    }

    function query(
      queryInfo: { active?: boolean; currentWindow?: boolean },
    ): Promise<Tab[]>;
    function query(
      queryInfo: { active?: boolean; currentWindow?: boolean },
      callback: (tabs: Tab[]) => void,
    ): void;
    function sendMessage<TResponse = any>(
      tabId: number,
      message: any,
      callback?: (response?: TResponse) => void,
    ): void;

    const onActivated: ChromeEvent<(activeInfo: TabActiveInfo) => void>;
    const onUpdated: ChromeEvent<
      (tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void
    >;
  }

  namespace scripting {
    interface InjectionTarget {
      tabId: number;
    }

    function executeScript(injection: {
      target: InjectionTarget;
      files: string[];
    }): Promise<unknown[]>;
  }

  namespace runtime {
    interface LastError {
      message?: string;
    }

    interface MessageSender {
      tab?: tabs.Tab;
    }

    interface Port {
      name: string;
      disconnect(): void;
      postMessage(message: any): void;
      onDisconnect: ChromeEvent<(port: Port) => void>;
      onMessage: ChromeEvent<(message: any, port: Port) => void>;
    }

    const lastError: LastError | undefined;
    const onConnect: ChromeEvent<(port: Port) => void>;
    const onMessage: ChromeEvent<
      (
        message: any,
        sender: MessageSender,
        sendResponse: (response?: any) => void,
      ) => boolean | void
    >;

    function connect(connectInfo?: { name?: string }): Port;
    function sendMessage<TResponse = any>(
      message: any,
      callback: (response?: TResponse) => void,
    ): void;
    function sendMessage<TResponse = any>(message: any): Promise<TResponse>;
  }

  namespace action {
    const onClicked: ChromeEvent<(tab: tabs.Tab) => void>;
  }

  namespace sidePanel {
    interface PanelOptions {
      tabId?: number;
      path?: string;
      enabled?: boolean;
    }

    interface OpenOptions {
      tabId?: number;
      windowId?: number;
    }

    function open(options: OpenOptions): Promise<void>;
    function setOptions(options: PanelOptions): Promise<void>;
  }
}

declare const chrome: {
  action: typeof chrome.action;
  runtime: typeof chrome.runtime;
  scripting: typeof chrome.scripting;
  sidePanel: typeof chrome.sidePanel;
  tabs: typeof chrome.tabs;
};
