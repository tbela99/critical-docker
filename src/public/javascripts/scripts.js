/* */
const output = document.querySelector('pre#output');

function scroll() {

    //
    output.scrollTop = output.scrollHeight;
}

document.addEventListener('click', function (e) {

    if (e.target.classList.contains('dropdown-toggle')) {

        e.target.classList.toggle('show');

        const menu = e.target.nextElementSibling;

        if (menu) {

            menu.classList.toggle('show', e.target.classList.contains('show'))
        }
    }

    const shown = document.querySelector('.dropdown-menu.show');

    if (shown && shown.previousElementSibling != e.target) {

        shown.classList.remove('show');

        if (shown.previousElementSibling) {

            shown.previousElementSibling.classList.remove('show')
        }
    }
});

document.forms[0].elements['dimensions'].addEventListener('blur', function (e) {

    if (!this.value.split(/[\s\n]/g).every(entry => {

        if (entry.trim() === '') {

            return true;
        }

        return entry.trim().match(/^\d+x\d+$/i)

    })) {
        this.setCustomValidity("Invalid dimensions");
    } else {
        this.setCustomValidity("");
    }
});

document.forms[0].addEventListener('submit', async e => {

    e.preventDefault();

    const form = e.target;
    const url = form.elements['urls'];

    form.classList.add('busy');
    url.classList.remove('is-invalid');

    try {

        const value = url.value.trim();

        if (value === '') {

            url.classList.add('is-invalid');
            return
        }

        const urls = value.split(/\n/g).map(value => value.trim()).filter(value => {

            if (value.trim() === '') {

                return false;
            }

            if (!['http:', 'https:'].includes(new URL(value, value).protocol)) {

                url.classList.add('is-invalid');
                return false
            }

            return true;
        });

        if (urls.length == 0) {

            url.classList.add('is-invalid')
        }

        if (url.classList.contains('is-invalid')) {

            return
        }

        const payload = {}

        Array.from(form.querySelectorAll('input[type=checkbox]')).forEach(function (el) {

            payload[el.name] = !!form.querySelector('input[name="' + el.name + '"]:checked')
        });

        const response = await fetch(form.action, {

            body: JSON.stringify(Object.assign({
                    urls
                },
                payload,
                {
                    dimensions: [...new Set(form.elements.dimensions.value.split(/\n|\s/g).filter(value => value.trim() !== '').map(value => value.trim()))]
                }
            )),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response && response.ok) {

            output.parentElement.classList.remove('d-none');
            output.innerHTML = '<div>Preparing ...';

            const data = await response.text();
            const timeout = setInterval(async function () {

                const response = await fetch('/poll', {
                    method: 'POST',
                    body: data,
                    headers: {

                        'Content-Type': 'application/json'
                    }
                });

                if (response && response.ok) {

                    const reply = await response.json();

                    if (reply.complete) {

                        form.classList.remove('busy');
                        clearInterval(timeout);

                        if ('code' in reply && reply.code == 0) {

                            const button = document.querySelector('.dropdown-toggle');

                            setTimeout(function () {

                                document.querySelector('a[download]').click()
                            }, 50)
                        }

                        output.insertAdjacentHTML('beforeend', `<div>All jobs have completed${reply.code && ' with status code ' + reply.code || ''}.`);
                        setTimeout(scroll, 50);

                        return
                    }

                    output.insertAdjacentHTML('beforeend', reply.message.join(''));
                    setTimeout(scroll, 50);
                }
            }, 1500);
        }

    } catch (error) {

        console.log({error})
        form.classList.remove('busy');
        url.classList.add('is-invalid');
    }
});
