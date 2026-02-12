// ==UserScript==
// @name         Last.fm comment viewer
// @namespace    http://last.fm/
// @version      2026-02-12
// @description  Directly view and write last.fm comments without having to press "Join the discussion".
// @author       pantheon0
// @match        https://www.last.fm/music/*
// @match        https://www.last.fm/music/*/*
// @match        https://www.last.fm/music/*/*/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    if (window.location.pathname.includes("+shoutbox")) return;

    function loadComments() {
        const commentLocationUrl = window.location + "/+shoutbox";
        console.log(commentLocationUrl);
        try {
            GM_xmlhttpRequest({
                method: "GET",
                url: commentLocationUrl,
                onload: (response) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, "text/html");

                    const containerCandidates = doc.querySelectorAll(".container.page-content");
                    let cleanedContainer = null;

                    for (const el of containerCandidates) {
                        if (el.classList.length === 2) {
                            cleanedContainer = el.cloneNode(true);
                            break;
                        }
                    }

                    if (!cleanedContainer) {
                        console.log("Container not found");
                        return;
                    }

                    cleanedContainer.classList.remove("container", "page-content");

                    cleanedContainer.querySelectorAll("div.col-sidebar, ul.pagination-list")
                        .forEach(el => el.remove());

                    const shoutList = cleanedContainer.querySelector("ul.shout-list.js-shout-list");
                    if (shoutList) {
                        const lis = Array.from(shoutList.children);
                        if (lis.length > 5) lis.slice(5).forEach(li => li.remove());
                    }

                    const colMain = document.querySelector("div.col-main.buffer-standard");

                    const sections = colMain ? Array.from(colMain.children).filter(el => el.tagName === "SECTION") : [];
                    if (sections.length >= 2) {
                        const targetSection = sections[sections.length - 3];
                        targetSection.replaceWith(cleanedContainer);
                    } else {
                        const joinButton = document.querySelector('a.btn-shouts-join');
                        if (!joinButton) return;
                        joinButton.insertAdjacentElement('beforebegin', cleanedContainer);
                    }

                    const form = cleanedContainer.querySelector('form.js-post-shout');
                    if (form) {
                        const textarea = form.querySelector('textarea.js-shout-input');
                        const postButton = form.querySelector('button.btn-post-shout');
                        const charCount = form.querySelector('span.js-char-count');

                        if (textarea && postButton && charCount) {
                            const update = () => {
                                const len = textarea.value.length;
                                postButton.disabled = len < 4;
                                charCount.textContent = len;
                            };

                            update();
                            textarea.addEventListener('input', update);

                            form.addEventListener('submit', (e) => {
                                e.preventDefault();

                                const formData = new FormData(form);
                                const action = form.getAttribute('action') || window.location.pathname;

                                fetch(action, {
                                    method: 'POST',
                                    body: formData,
                                    credentials: 'same-origin'
                                })
                                .then(res => {
                                    if (res.ok) {
                                        window.location.reload();
                                    } else {
                                        console.log('Failed to post shout', res.status);
                                    }
                                })
                                .catch(err => console.log('Error posting shout', err));
                            });
                        }
                    }

                }
            });

        } catch (err) {
            console.log("error", err);
        }
    }

    let lastUrl = location.href;

    const runOnNavigation = () => {
        if (location.href === lastUrl) return;
        lastUrl = location.href;

        setTimeout(() => {
            loadComments();
        }, 1500);
    };

    const pushState = history.pushState;
    history.pushState = function() {
        pushState.apply(this, arguments);
        runOnNavigation();
    };

    const replaceState = history.replaceState;
    history.replaceState = function() {
        replaceState.apply(this, arguments);
        runOnNavigation();
    };

    window.addEventListener('popstate', runOnNavigation);

    loadComments();
})();
