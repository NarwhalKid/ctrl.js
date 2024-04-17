// store url on load
let currentPage = location.href;

// listen for changes
setInterval(function()
{
    if (currentPage != location.href)
    {
        // page has changed, set new page as 'current'
        currentPage = location.href;
        
        document.getElementsByClassName("action-menu__tools")[0].children[0].click()
    }
}, 10);
