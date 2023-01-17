
window.onload = () => {
    let fileInput = document.getElementById('send_file');
    fileInput.addEventListener('onChange',sendFile);
}

function sendFile(){
    let form = new FormData();
    let fileInput = document.getElementById('send_file');

    for(let file of fileInput.files){
        form.append('files', file);
    }
    form.append('writer', document.getElementById('myId').value);
    form.append('writerName', $('#myName').val());
    form.append('profileImg', $('#myProfile').val());
    form.append('roomId', document.getElementById('chat_header').dataset.rid);

    $.ajax({
        url : "/file",
        type : `POST`,
        processData : false,
        contentType : false,
        data : form,
        success : (response) => {
            console.log(`파일잘보냄`);
        },
        error : (err) => {
            console.log(err.responseText);
        }
    })
    fileInput.value = '';
}

$(function(){
    $('#chat_writer').val('');
});
