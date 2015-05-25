'use strict';

$(document).ready(function() {
	var textBox = document.querySelector('textarea');
	textBox.focus();

	var outputBox = document.querySelector('#output');
	var input = textBox.value;

	function render (event) {
		input = textBox.value;
		outputBox.textContent = '`' + input + '`';
		MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'output' ]);
	}

	textBox.addEventListener('input', render);

	// var menubar = document.querySelectorAll('.syntax-tab > div');
	// menubar.addEventListener('click', function (event) {
	// 	console.log(event);
	// 	console.log('click');
	// });

	$('.syntax-tab > div').on('click', function(event) {
		var caretPos = textBox.selectionStart;
		console.log(caretPos);
		event.preventDefault();
		textBox.focus();
		var syntax = $(event.currentTarget).attr('id');
		textBox.value += syntax;
		render();

	});
});
