/*
 *  Copyright (c) Microsoft Corporation.
 *  Licensed under the MIT license.
 */
import browser from 'webextension-polyfill'
import { type MESSAGE_PAYLOAD } from './types'
import { init as initTrustList } from './trustlist'
import { MESSAGE_C2PA_INSPECT_URL } from './constants'
import { validateUrl } from './c2pa'
console.debug('Background: Script: start')

browser.runtime.onInstalled.addListener((details) => {
  console.debug('Background: Event: onInstalled: ', details.reason)
})

browser.webRequest.onBeforeRequest.addListener(
  function (details) {
    console.debug('Background: Intercepted image request: ', details.url, 'color: #2784BC;')
    // You can perform actions here based on the request URL or other details.
    // For example, redirect the request, block it, etc.
  },
  { urls: ['*://*/*.jpg', '*://*/*.mp4'] }
)

/*
  Having multiple listeners in the background script requires special handling.
  When using the webextension-polyfill with multiple listeners, we must use the following form:
  (Don't use the async keyword in the listener function.)
*/
browser.runtime.onMessage.addListener(
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  (request: MESSAGE_PAYLOAD, _sender) => {
    if (request.action === 'tabid') {
      return Promise.resolve(_sender.tab?.id)
    }
    if (request.action === MESSAGE_C2PA_INSPECT_URL && request.data != null) {
      const url = request.data as string
      return validateUrl(url)
    }
    return true // do not handle this request; allow the next listener to handle it
  }
)

async function init (): Promise<void> {
  if (chrome.offscreen !== undefined) {
    if (await chrome.offscreen.hasDocument()) {
      return
    }
    await chrome.offscreen
      .createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.DOM_PARSER],
        justification: 'Private DOM access to parse HTML'
      })
      .catch((error) => {
        console.error('Failed to create offscreen document', error)
      })
  }

  await browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/cr128.png',
    title: 'Content Credentials',
    message: 'Loaded'
  })

  await initTrustList()
}

/*

  Below are examples of other event listeners that can be used in the background script.

*/

// Requires "tabs"
browser.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.debug(`Background: Event: tabs.onUpdated.addListener: Tab ${tabId} update: ${JSON.stringify(changeInfo)}`)
})

// Requires "tabs"
browser.tabs.onCreated.addListener(function (tab) {
  console.debug(`Background: Event: tabs.onCreated.addListener: Tab ${tab.id} created`)
})

// Requires "webNavigation" permission and host permissions for the specified URL patterns.
// Requires "tabs"
browser.webNavigation.onCompleted.addListener(function (details) {
  browser.tabs.get(details.tabId).then(tab => {
    console.debug(`Background: Event: webNavigation.onCompleted: Tab ${details.tabId} has fully loaded. URL: ${tab.url}`)
  }).catch(error => {
    console.warn(`Error fetching tab details: ${error}`, details.url)
  })
}, { url: [{ urlMatches: 'http://*/*' }, { urlMatches: 'https://*/*' }] })

// Requires "tabs"
browser.tabs.onActivated.addListener(activeInfo => {
  browser.tabs.get(activeInfo.tabId).then(tab => {
    console.debug(`Background: Event: tabs.onActivated: Tab ${tab.id} in the active tab. URL: ${tab.url}`)
  }).catch(error => {
    console.error(`Error fetching tab details: ${error}`)
  })
})

void init()

console.debug('Background: Script: end')
