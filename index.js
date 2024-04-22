

function modifySquareStyle() {
    // Get the square element by id
    var square = document.getElementById('square');

    // Modify the style of the square
    // square.style.backgroundColor = getRandomColor(); // Change background color to a random color
    square.style.width = 100 + 'px'; // Change width to a random size
    square.style.height = 100 + 'px'; // Change height to a random size

    square.style.top = - window.screenY + 550 + 'px';
    square.style.left =- window.screenX + 550 + 'px';
}

setInterval(modifySquareStyle, 1);