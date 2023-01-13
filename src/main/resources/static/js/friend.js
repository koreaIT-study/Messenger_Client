const sockJs = new SockJS("/stomp/chat");
const stomp = Stomp.over(sockJs);
const profilePath = "http://35.216.1.250:12000/upload";
const msgFilePath = "http://35.216.1.250:12000/msgFile";

let msgSubscription = "";
let inputSubscription = "";

function getFriendList() {
	// 전체 친구 목록 가져오기
	// getFriends
	const userId = $('#myId').val();
	jsParamAjaxCall('GET', '/getFriends', { userId: userId }, function(response) {
		const errno = response.errno;
		if (errno === 0) {
			const friendList = response.data;
			let friendListHtml = "";
			for (let i = 0; i < friendList.length; i++) {
				friendListHtml += "<li id='" + friendList[i].friendId + "' data-rid='" + (friendList[i].roomId ?? '') + "' data-uid='" + friendList[i].friendId + "' data-group='N' >"
				friendListHtml += "<div class='friend-box'>"
				if (!friendList[i].profileImg) {
					friendListHtml += `<div class='friend-profil'></div>`;
				} else {
					friendListHtml += `<div class='friend-profil' 
					style = 'background: url(${profilePath}/${friendList[i].profileImg}); 
					background-size: cover;'></div >`;
				}
				friendListHtml += "<div class='friend-title'>" + friendList[i].name + "</div>"
				friendListHtml += `<div class='friend-msg'>${friendList[i].email}</div>`
				friendListHtml += "</div>"
				friendListHtml += "</li>"

			}
			$('#friend-list-box').html(friendListHtml);
		} else {
			_cmmnAlert.getFailed();
		}
	});

	// friend list에 connect event
	let friendList = $('#friend_list').find('#friend-list-box').find('li');
	for (let i = 0; i < friendList.length; i++) {
		friendList[i].addEventListener('dblclick', () => connect(friendList[i]));
	}
}

function getRoomList() {
	// 전체 채팅방 목록 가져오기
	jsParamAjaxCall('GET', '/chat/getRoomList', {}, function(response) {
		let roomListHtml = "";
		for (let i = 0; i < response.length; i++) {

			roomListHtml += `<li data-rId=${response[i].roomId} ondblclick="connect(this)">`;
			roomListHtml += '<div class="friend-box">';
			if (!response[i].roomImagePath) {
				roomListHtml += `<div class='friend-profil'></div>`;
			} else {
				roomListHtml += `<div class='friend-profil' 
					style = 'background: url(${profilePath}/${response[i].roomImagePath}); 
					background-size: cover;'></div >`;
			}
			roomListHtml += '<div class="friend-title">';
			roomListHtml += response[i].roomName + '<span class="chatRoomLi">' + response[i].cnt + '</span>';
			roomListHtml += '<span class="chatRoomLi right time">' + response[i].timestamp.split('.')[0] + '</span></div>';
			roomListHtml += '<div class="friend-msg">' + response[i].message + '</div></div></li>';
		}

		$('#room-list-box').html(roomListHtml);
	});
}

function getFriendListMenu() {

	$('#friend-list-box').show();
	$('#room-list-box').hide();
}
function getChatRoomListMenu() {
	$('#friend-list-box').hide();
	$('#room-list-box').show();
}
function chatRoomHide() {
	$('#chat').hide();
}

function showSetSelect(e) {
	e.target.parentElement.children[1].classList.remove('hidden')
}
const sendMessage = () => {
	let header = document.getElementById('chat_header');
	let $textArea = $("#chat_writer");

	let param = {
		roomId: header.dataset.rid,
		writer: $('#myId').val(),
		message: $textArea.val(),
		writerName: $('#myName').val(),
		profileImg: $('#myProfile').val()
	};
	console.log("메시지 보냄", $textArea.val())
	$textArea.val('');
	stomp.send("/pub/chat/message", {}, JSON.stringify(param));
}
window.onload = function() {
	document.getElementById('friendListBtn').click();
	getFriendList();
	getRoomList();

	const userId = $('#myId').val();
	// 채팅방 목록 관리
	stomp.connect({}, function() {
		stomp.subscribe("/sub/chat/roomList/" + userId, function(chat) {
			let obj = JSON.parse(chat.body);
			updateChatRoom(obj);
		})
	})

	// message 보내기
	$("#chat_writer").on("keyup", (e) => {
		let header = document.getElementById('chat_header');

		e.preventDefault();
		if (e.keyCode != 13) {
			// [이름]님이 입력중입니다. 표시
			let param = {
				roomId: header.dataset.rid,
				writer: $('#myId').val(),
				message: "",
				writerName: $('#myName').val()
			};
			stomp.send("/pub/chat/input", {}, JSON.stringify(param));

			return;
		};
		if (e.shiftKey) return;
		if ($("#chat_writer").val().trim() == '' || $("#chat_writer").val() == '\n') {
			$("#chat_writer").val('');
			$("#chat_writer").focus();
			return;
		}
		sendMessage();
	})

	let searchInput = document.getElementById('searchText');
	searchInput.addEventListener('keyup', (e) => {
		search(e);
	});

	document.addEventListener("click", function(e) {
		if (e.target.className.match('div_select')) return;
		if (e.target.className.match('set-img')) return;

		document.getElementsByClassName('div_select')[0].parentElement.classList.add('hidden')
	})
}

function makeChatRoom() {
	let friendModalList = $('[name=friend-modal]');
	const userId = $('#myId').val();
	let chatRoomUser = [];
	chatRoomUser.push(userId);

	let checkCnt = 0;
	let roomName = $('#myName').val();

	for (let i = 0; i < friendModalList.length; i++) {
		if (friendModalList[i].checked) {
			chatRoomUser.push($('#modal-chatroom-list-box').find('li')[i].id);
			roomName += "," + $($('#modal-chatroom-list-box').find('li')[i]).find('.friend-title').text();

			checkCnt++;
		}
	}

	if (checkCnt == 0) {
		alert('1명 이상 check 해주세요.');
		return;
	}

	let param = {
		roomName: roomName,
		isGroup: 'Y',
		userId: chatRoomUser
	};

	jsAjaxPostJsonCall('/chat/room', param, (response) => {
		$('#chat').show();
		if (!enterRoom(response.roomId)) return;
		searchRoomInfo(response.roomId);
		getMessages(response.roomId);

		// 채팅 맨밑으로 내림
		let wrap = document.getElementById('chat_msg_template');
		let lastChildDiv = wrap.lastChild;
		if (lastChildDiv != null)
			lastChildDiv.lastChild.scrollIntoView();

		modalAddChatRoomClose();
	})

}

var sessionContainer = [];

function connect(el) {
	let room = searchRoom(el);
	let roomId = room.roomId;
	$('#chat').show();
	if (!enterRoom(roomId)) return;
	searchRoomInfo(roomId);
	getMessages(roomId);
	// 채팅 맨밑으로 내림
	let wrap = document.getElementById('chat_msg_template');
	let lastChildDiv = wrap.lastChild;
	if (lastChildDiv != null)
		lastChildDiv.lastChild.scrollIntoView();

	modalAddChatRoomClose();
}

function searchRoom(el) {
	let roomId = $(el).data('rid');
	let userId = $(el).data('uid');
	let room = "";

	if (!roomId) { // 친구목록에서 들어오는 경우
		// 친구의 id(userId)로 roomId(1:1 톡방)을 찾아야한다.
		// roomId = 1; // example
		// server 쪽에서 roomId를 못찾으면 roomId만들고 roomId return
		let param = {
			roomName: $('#myName').val() + "," + $(`#${el.id} div div.friend-title`).text(),
			isGroup: $(el).data('group'),
			userId: [userId, $('#myId').val()],
		};
		jsAjaxPostJsonCall('/chat/room', param, (response) => {
			room = response;
			el.dataset.rid = room.roomId;
		})
	} else {
		jsParamAjaxCall('GET', '/chat/room?roomId=' + roomId, {}, function(response) {
			room = response;
		})
	}
	console.log("room", room)
	return room;
}

function searchRoomInfo(roomId) {
	// roomId로 채팅방 정보를 찾아주는 method
	jsParamAjaxCall('GET', '/chat/room?roomId=' + roomId, {}, function(response) {
		let title = $('.chat_title').children();
		title[0].innerHTML = response.roomName;
		title[1].innerHTML = "멤버 " + response.cnt;
		if (response.roomImagePath != null)
			$('#header_profile').attr('src', `${profilePath}/${response.roomImagePath}`);
		else {
			$('#header_profile').attr('src', `img/anonymous_profile.png`);
		}
	});
}


function getMessages(roomId, time) {
	// roomId가 있으면 messages전부 가져와서 view에 뿌려주는 logic 필요
	let url = `/get-chat-message/${roomId}`;
	let isScroll = false;
	if (time) {
		url = `/get-chat-message/${roomId}?time=${time}`;
		isScroll = true;
	}

	jsParamAjaxCall('GET', url, {}, function(response) {
		let messages = response.sort((a, b) => a.timestamp > b.timestamp ? 1 : -1)

		let messageHtml = "";

		let html = "";

		console.log("response", response)

		for (let i = 0; i < messages.length; i++) {
			if (i != 0 && messages[i - 1].writer != messages[i].writer) {
				if (isMyMessage(messages[i - 1])) {
					messageHtml += myMessageTemplate(html, messages[i - 1]);
				} else {
					messageHtml += otherMessageTemplate(html, messages[i - 1]);
				}
				html = "";
			}

			if (isMyMessage(messages[i])) {
				// 내가 쓴 message
				html += myMessage(messages[i]);
			} else {
				html += otherMessage(messages[i]);
			}

		}

		// message가 남아있으면
		if (html != "") {
			if (isMyMessage(messages[messages.length - 1])) {
				messageHtml += myMessageTemplate(html, messages[messages.length - 1]);
			} else {
				messageHtml += otherMessageTemplate(html, messages[messages.length - 1]);
			}
		}

		if (isScroll) {
			let tempMessageHtml = $('#chat_msg_template').html();
			$('#chat_msg_template').html(messageHtml + tempMessageHtml);
		} else {
			$('#chat_msg_template').html(messageHtml);
		}

	});


}

// message를 subscribe해서 view에 뿌려주는 method
function subMessage(message) {

	console.log("message", message)
	let wrap = document.getElementById('chat_msg_template');
	let lastChildDiv = wrap.lastChild;

	let lastWriter = "";
	if (lastChildDiv != null) {
		lastWriter = wrap.lastChild.dataset.uid;
		//lastWriter = lastChildDiv.querySelector('.chat_person_name').textContent;
	}

	if (lastWriter == message.writer) {
		if (isMyMessage(message)) {
			lastChildDiv.innerHTML += myMessage(message).trim();
		}
		else {
			let chatPerson = lastChildDiv.querySelector('.chat_person');
			chatPerson.innerHTML += otherMessage(message).trim();
		}
	} else {
		if (isMyMessage(message))
			wrap.innerHTML += myMessageTemplate(myMessage(message).trim(), message);
		else
			wrap.innerHTML += otherMessageTemplate(otherMessage(message).trim(), message);
	}

	if (lastChildDiv != null)
		lastChildDiv.lastChild.scrollIntoView();

}

function isMyMessage(message) {
	const userId = $('#myId').val();
	if (userId == message.writer) return true;

	return false;
}

function downFile(e) {
	let roomId = document.getElementById('chat_header').dataset.rid;
	let msg = e.target.dataset.svfnm;

	let a = document.createElement('a');
	a.hidden = true;
	a.href = `/downFile/${roomId}/${msg}`;
	document.body.appendChild(a);
	a.click();
	a.remove();
}

function getHtmlMsgTag(msg) {
	let ext = msg.extension;
	let htmlTag = ``;
	if (['.img', '.jpg', '.png', '.jpeg', '.gif'].includes(ext)) {
		console.log(msg)
		htmlTag = `<img src="${msgFilePath + "/" + msg.roomId + "/" + msg.message}" onclick="downFile(event);" class="img_file" data-svFnm="${msg.message}">`
	} else if (ext) {
		let splitMsg = msg.message.split('||');
		htmlTag = `<div class="txt_file" onclick="downFile(event);" data-svFnm="${msg.message}"><img src="img/txtFile.png" style='width:100px;'><span>${splitMsg[splitMsg.length-1]}</span></div>`
	} else {
		htmlTag = msg.message.replaceAll("\n", `<br>`)
	}
	return htmlTag;
}

function myMessage(msg) {
	let htmlMsgTag = getHtmlMsgTag(msg);
	let myMessage = "<div class='my_chat_flexable'>";
	myMessage += `<span class='write_date' data-wdate='${msg.timestamp}'>`;
	myMessage += `${msg.timestamp.split('.')[0].split(' ')[1]}</span>`;
	myMessage += `<div class='my_chat'>${htmlMsgTag}</div></div>`;

	return myMessage;
}

function myMessageTemplate(messages, message) {
	let myTemplate = "<div class='my_chat_wrapper' data-uid='" + message.writer + "'>";
	myTemplate += messages;
	myTemplate += "</div>";

	return myTemplate;
}

function otherMessage(msg) {
	let htmlMsgTag = getHtmlMsgTag(msg);
	let otherMessage = "<div class='chat_msg_flexable'>";
	otherMessage += `<div class='chat_msg'>${htmlMsgTag}</div>`;
	otherMessage += `<span class='write_date' data-wdate='${msg.timestamp}'>`;
	otherMessage += msg.timestamp.split('.')[0].split(' ')[1] + "</span></div>";

	return otherMessage;
}

function otherMessageTemplate(messages, message) {
	let profileImg = message.profileImg != null ? `${profilePath}/${message.profileImg}` : "img/anonymous_profile.png";
	console.log(message);
	let otherTemplate = "<div class='chat_person_wrap' data-uid='" + message.writer + "'>";
	otherTemplate += "<div class='chat_person_profile'>";
	otherTemplate += `<img src=${profileImg} style="width:50px; height:50px;"></div>`;
	otherTemplate += "<div class='chat_person'><div class='chat_person_name'>";
	otherTemplate += message.writerName + "</div>";
	otherTemplate += messages;
	otherTemplate += "</div></div>";

	return otherTemplate;
}

var clearText = () => {
	setTimeout(() => {
		$('#chat-input').text('');
	}, 1000);
}

function enterRoom(roomId) {
	let header = document.getElementById('chat_header');
	let curRoomId = header.dataset.rid;
	if (curRoomId == roomId) return false;

	header.dataset.rid = roomId;


	if (msgSubscription != '') {
		msgSubscription.unsubscribe();
	}
	if (inputSubscription != '') {
		inputSubscription.unsubscribe();
	}



	msgSubscription = stomp.subscribe("/sub/chat/room/" + roomId, function(chat) {
		let obj = JSON.parse(chat.body);
		subMessage(obj);
	});


	inputSubscription = stomp.subscribe("/sub/chat/chatInput/" + roomId, function(chat) {
		let obj = JSON.parse(chat.body);
		console.log("chat-input", obj)
		const userId = $('#myId').val();

		if (userId != obj.writer) {
			if ($('#chat-input').text() == '') {
				$('#chat-input').text(obj.message);
			}
			clearInterval(clearText);
			clearText = setTimeout(() => {
				$('#chat-input').text('');
			}, 1000);
		}
	});

	//roomIdSessionCtx.push(roomid);
	return true;
}

function updateChatRoom(msg) {
	let roomList = document.getElementById('room-list-box');
	let flag = false;

	for (let room of roomList.children) {
		if (msg.roomId == room.dataset.rid) {
			flag = true;
			break;
		}
	}

	let lastMsg = msg.extension ? msg.message.substr(msg.message.lastIndexOf('||')) : msg.message.replaceAll(`\n`, `<br>`);


	// 채팅방 없으면 만들어주기
	if (!flag) {
		let roomHtml = "";
		roomHtml += `<li data-rId=${msg.roomId} ondblclick="connect(this)">`;
		roomHtml += '<div class="friend-box">';
		roomHtml += '<div class="friend-profil"></div>';
		roomHtml += '<div class="friend-title">';
		roomHtml += msg.roomName + '<span class="chatRoomLi">' + msg.cnt + '</span>';
		roomHtml += '<span class="chatRoomLi right time">' + msg.timestamp.split('.')[0] + '</span></div>';
		roomHtml += '<div class="friend-msg">' + lastMsg + '</div></div></li>';

		$(roomList).prepend(roomHtml);
	}

	let roomListChild = $('#room-list-box').children();

	for (let i = 0; i < roomListChild.length; i++) {
		if (roomListChild[i].dataset.rid == msg.roomId) {
			$(roomListChild[i]).find('.chatRoomLi.right.time').html(msg.timestamp.split('.')[0]);
			$(roomListChild[i]).find('.friend-msg').html(lastMsg);
			roomList.prepend($(roomListChild)[i]);
			break;
		}
	}


}

function search(event) {
	let friendListBox = $('#friend-list-box');
	let eventVal = event.target.value;
	if (friendListBox[0].style.display == 'none') {
		// 채팅방 목록 보임
		let friendNames = $('#room-list-box').find('.friend-title');
		for (let i = 0; i < friendNames.length; i++) {
			if (friendNames[i].textContent.match(eventVal)) {
				$($('#friend_list').find('#room-list-box').find('li')[i]).show();
			} else {
				$($('#friend_list').find('#room-list-box').find('li')[i]).hide();
			}
		}

	} else {
		// 친구 목록 보임
		let friendNames = $('#friend-list-box').find('.friend-title');
		for (let i = 0; i < friendNames.length; i++) {
			if (friendNames[i].textContent.match(eventVal)) {
				$($('#friend_list').find('#friend-list-box').find('li')[i]).show();
			} else {
				$($('#friend_list').find('#friend-list-box').find('li')[i]).hide();
			}
		}
	}

}


function chatRoomOut() {

}

/* scroll 맨위로 올릴 때 메시지 100개씩 뿌려주기 */
function getLastMessage() {
	let nowScrollPosition = document.getElementById('chat_msg_template').scrollTop;
	let wrap = document.getElementById('chat_msg_template');
	if (nowScrollPosition == 0 && wrap.firstChild != null) {
		let time = wrap.firstChild.querySelector('.write_date').dataset.wdate;
		let curRoomId = document.getElementById('chat_header').dataset.rid;
		getMessages(curRoomId, time);

		let mwrap = document.querySelectorAll('.write_date')

		for (let i = 0; i < mwrap.length; i++) {
			if (mwrap[i].dataset.wdate == time) {
				mwrap[i].scrollIntoView();
				break;
			}
		}
	}
}

// 채팅방 이미지 변경
function changeChatRoomProfile() {
	url = "/chat/change-room-img";

	const file = document.querySelector('#changeChatRoomProfile').files[0];

	let header = document.getElementById('chat_header');
	let roomId = header.dataset.rid;

	const formData = new FormData();
	formData.append('roomId', roomId);
	formData.append('file', file)

	$.ajax({
		url: url,
		type: `POST`,
		processData: false,
		contentType: false,
		data: formData,
		success: (response) => {
			console.log("response", response);
			getRoomList();

		},
		error: (err) => {
			console.log("change room img err:: " + err);
		}
	})
}