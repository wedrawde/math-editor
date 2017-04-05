const latexCommands = require('./latexCommands')
const specialCharacters = require('./specialCharacters')
const sanitizeHtml = require('sanitize-html')
const sanitizeOpts = require('./sanitizeOpts')
const util = require('./util')
const MQ = MathQuill.getInterface(2)
const $equationEditor = $('.equationEditor')
const $answer = $('.answer')
const $math = $('.math')

const keyCodes = {
    ENTER: 13,
    ESC:   27
}

let $toolbar
const $outerPlaceholder = $(`<div class="outerPlaceholder hidden">`)
let mathEditor

function moveElementInto($element, $into) {
    $element.detach()
    $into.append($element)
}

function moveElementAfter($element, $after) {
    $element.detach()
    $after.after($element)
}

function hideElementInDOM($element) {
    moveElementInto($element, $outerPlaceholder)
}

let editor

window.onload = () => {
    // TODO: replace with data attributes?
    let answerFocus = true
    let latexEditorFocus = false
    let editorVisible = false

    $('body').append($('<link rel="stylesheet" type="text/css" href="/math.css"/>'))
    $('body').append($outerPlaceholder)

    initToolbar()
    mathEditor = initMathEditor()

    function initMathEditor() {
        const $mathEditor = $(`
            <div class="math">
                <div class="close" title="Ctrl-Enter">Sulje</div>
                <div class="boxes">
                    <div class="equationEditor"></div>
                    <textarea class="latexEditor" placeholder="LaTex"></textarea>
                </div>
            </div>`)

        hideElementInDOM($mathEditor)

        const $latexEditor = $mathEditor.find('.latexEditor')
        const $equationEditor = $mathEditor.find('.equationEditor')

        const mathField = MQ.MathField($equationEditor.get(0), {
            handlers: {
                edit: () => !latexEditorFocus && $latexEditor.val(mathField.latex()),
                enter: field => {
                    mathEditor.closeEditor()
                    setTimeout(() => insertNewEquation('<div></div>'), 2)
                }
            }
        })

        function onLatexUpdate() { setTimeout(() => mathField.latex($latexEditor.val()), 1) }

        $latexEditor
            .keyup(onLatexUpdate)
            .on('focus blur', e => latexEditorFocus = e.type === 'focus')

        $mathEditor.find('.close').mousedown(e => {
            e.preventDefault()
            closeEditor()
        })

        function insertNewEquation(optionalMarkup) {
            window.document.execCommand('insertHTML', false, (optionalMarkup ? optionalMarkup : '') + '<img class="result new" style="display: none"/>');
            const $addedEquationImage = $('.result.new')
            $addedEquationImage
                .removeClass('new')

            moveElementAfter($mathEditor, $addedEquationImage)

            $addedEquationImage
                .closest('.answer')
                .attr('data-math-editor-visible', true)

            mathField.latex('')
            editorVisible = true
            $toolbar.find('.mathToolbar').show()
            setTimeout(() => mathField.focus(), 0)
        }


        function insertMath(symbol) {
            if(latexEditorFocus) {
                util.insertToTextAreaAtCursor($latexEditor.get(0), symbol)
                onLatexUpdate()
            } else if($equationEditor.hasClass('mq-focused')) {
                mathField.typedText(symbol)
                if(symbol.startsWith('\\')) mathField.keystroke('Tab')
                setTimeout(() => mathField.focus(), 0)
            }
        }

        function closeEditor() {
            const $img = $mathEditor.prev()
            if($latexEditor.val().trim() === '') {
                $img.remove()
            } else {
                $img.show()
                    .prop('src', '/math.svg?latex=' + encodeURIComponent($latexEditor.val()))
                    .prop('alt', $latexEditor.val())
            }
            $mathEditor.detach()
            $('.outerPlaceholder').append($mathEditor)
            editorVisible = false // TODO
            mathField.blur()
            latexEditorFocus = false // TODO
            // $answer.get(0).focus()
        }

        function openEditor($img) {
            $img.hide()
            moveElementAfter($mathEditor, $img)
            const latex = $img.prop('alt')
            $latexEditor.val(latex)
            onLatexUpdate()
            editorVisible = true
            setTimeout(() => mathField.focus(), 0)
        }

        return {
            insertNewEquation,
            insertMath,
            closeEditor,
            openEditor
        }
    }

    function initToolbar() {
        $toolbar = $(`        
        <div class="toolbar">
            <div class="characters">
                <span class="special-characters">
                  <div class="list"></div>
                </span>
            </div>
            <div class="mathToolbar list hidden"></div>
            <p>
                <button class="newEquation actionButton" title="Ctrl-L">Lisää kaava</button>
            </p>
        </div>
        `)

        hideElementInDOM($toolbar)

        initSpecialCharacterToolbar()
        initMathToolbar()
        initNewEquation()

        function initMathToolbar() {
            $toolbar.find('.mathToolbar.list').append(latexCommands
                .map(o => `<button title="${o.action}" data-command="${o.action}">
<img src="/math.svg?latex=${encodeURIComponent(o.label ? o.label.replace(/X/g, '\\square') : o.action)}"/>
</button>`).join('')
            ).on('mousedown', 'button', e => {
                e.preventDefault()
                mathEditor.insertMath(e.currentTarget.dataset.command)
            })
        }

        function initSpecialCharacterToolbar() {
            $toolbar.find('.characters .list')
                .append(specialCharacters.map(char => `<span class="button" ${char.latexCommand ? `data-command="${char.latexCommand}"` : ''}>${char.character}</span>`))
                .on('mousedown', '.button', e => {
                    e.preventDefault()
                    const character = e.currentTarget.innerText
                    const command = e.currentTarget.dataset.command
                    window.document.execCommand('insertText', false, character)
                    // TODO: check whether the math editor has focus -> insert command instead of character
                    // if(answerFocus)
                    // else insertMath(command || character)
                })
        }

        function initNewEquation() {
            $toolbar.find('.newEquation').mousedown((e => {
                e.preventDefault()
                if (!answerFocus) return // TODO: remove when button is only visible when textarea has focus
                mathEditor.insertNewEquation()
            }).bind(this))
        }
    }

    function openEditor($element) {
        if (!$toolbar) return // TODO: fix
        $toolbar.detach()
        $element.before($toolbar)
        $toolbar.show()

        $element.on('keydown', e => {
            if(!e.altKey && !e.shiftKey &&
                ((e.ctrlKey && e.keyCode === keyCodes.ENTER) ||
                (!e.ctrlKey && e.keyCode === keyCodes.ESC ))) closeEditor()
        }).on('mousedown', '.result', e => {
            if($element.closest('.answer').data('math-editor-visible') === 'true') mathEditor.closeEditor()
            mathEditor.openEditor($(e.target))
        }).on('keypress', e => {
            if(e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'l') mathEditor.insertNewEquation()
        })
    }

    function closeEditor() {
        // TODO: remove bindings
        if (!$toolbar) return // TODO: fix
        $toolbar.detach()
        hideElementInDOM($toolbar)
        $toolbar.hide()
        mathEditor.closeEditor()
    }

    editor = {
        openEditor,
        closeEditor
    }
}

const makeRichText = selector => {
    $(selector).each((i, element) => {
        const $editor = $(element)

        $editor.on('focus', e => {
            editor.openEditor($(e.target))
        }).on('blur', e => {
            // editor.closeEditor()
        })
    })

    // $answer.on('paste', e => {
//     const reader = new FileReader()
//     const file = e.originalEvent.clipboardData.items[0].getAsFile()
//     if(file) reader.readAsDataURL(file)
//
//     reader.onload = evt => {
//         const img = `<img src="${evt.target.result}"/>`
//         window.document.execCommand('insertHTML', false, sanitizeHtml(img, sanitizeOpts))
//     }
// })
//
// $answer.on('focus blur', e => {
//     if(editorVisible && e.type === 'focus') onClose()
//     answerFocus = e.type === 'focus'
// })
//     .keypress(e => {
//         if(e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'l') newEquation()
//     })
//
}

makeRichText('.answer')

$('.save').click(() => $.post('/save', {text: $answer.html()}))

$.get('/load', data => data && $answer.html(data.html))

const autosave = (text, async = true) => $.post({
    url:  '/save',
    data: {text},
    async
})

Bacon.fromEvent($('[data-js-handle="answer"]'), 'input focus')
    .map(e => e.currentTarget.innerHTML)
    .skipDuplicates()
    .debounce(5000)
    .onValue(autosave)

window.onbeforeunload = () => {
    onClose()
    autosave($answer.html(), false)
    return null
}
