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

    let commentLocationUrl = window.location + "/+shoutbox";
    if (window.location.pathname.includes("+shoutbox")) {
        return;
    }

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

                cleanedContainer
                    .querySelectorAll("div.col-sidebar")
                    .forEach(el => el.remove());

                const shoutList = cleanedContainer.querySelector("ul.shout-list.js-shout-list");

                if (shoutList) {
                    const lis = Array.from(shoutList.children);
                    if (lis.length > 5) {
                        lis.slice(5).forEach(li => li.remove());
                    }
                }

                cleanedContainer
                    .querySelectorAll("ul.pagination-list")
                    .forEach(el => el.remove());

                const colMain = document.querySelector("div.col-main.buffer-standard");

                if (!colMain) {
                    console.log("col-main not found");
                    return;
                }

                const sections = Array.from(colMain.children)
                    .filter(el => el.tagName === "SECTION");

                if (sections.length < 2) {
                    console.log("Not enough sections found");
                    return;
                }

                const targetSection = sections[sections.length - 3];

                targetSection.replaceWith(cleanedContainer);

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
                                    // we simply refresh the page to view the updated comments.
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

})();
