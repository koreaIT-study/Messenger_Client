function popOpen() {
	const modalPop = $(".modal-wrap");
	const modalBg = $(".modal-bg");

	$(modalPop[0]).show();
	$(modalBg[0]).show();
}

function popClose() {
	const modalPop = $(".modal-wrap");
	const modalBg = $(".modal-bg");

	$(modalPop[0]).hide();
	$(modalBg[0]).hide();
}

// 친구 찾기
function searchUser(e) {
	const searchInput = document.querySelector("#modalSearchText").value;
	const userId = document.querySelector('#myId').value;
	if (e.key === "Enter" || e === 'Click') {
		const param = {
			searchKey: searchInput,
			userId: userId
		};

		if (searchInput) {
			jsParamAjaxCall("GET", "/searchUser", param, function(response) {
				const errno = response.errno;
				if (errno === 0) {
					const data = response.data;
					console.log(response)
					let friendListHtml = "";
					let i = 0;
					data.forEach((el) => {
						friendListHtml += "<li friendId='" + data[i].id + "' email='" + (data[i].email ?? "") + "'ondblclick='addFriend(this);'>";
						friendListHtml += "<div class='friend-box'>";
						friendListHtml += `<div class='friend-profil' style = 'background: url(${profilePath}/${data[i].profileImg});    background-repeat: round;'></div>`;
						friendListHtml += "<div class='friend-title'>" + data[i].name + "</div>";
						friendListHtml += `<div class='friend-msg'>${data[i].email}</div>`;
						friendListHtml += "</div>";
						friendListHtml += "</li>";
					});
					document.querySelector("#modal_friend-list-box").innerHTML =
						friendListHtml;
				} else {
					_cmmnAlert.getFailed();
				}
			});
		}
	}
}

function addFriend(el) {
	const userId = document.querySelector("#myId").value;
	const friendId = el.getAttribute("friendId");

	const params = {
		userId,
		friendId,
	};
	let check = true;

	document.querySelectorAll("#friend-list-box > li").forEach((el) => {
		const id = el.getAttribute("data-uid");
		if (friendId === id) {
			alert("이미 등록된 친구입니다.");
			check = false;
		}
	});

	if (check) {
		jsAjaxPostJsonCall("/addFriend", params, function(response) {
			const errno = response.errno;
			if (errno === 0) {
				alert("친구 추가 되었습니다.");
				getFriendList();
			} else {
				_cmmnAlert.postFailed();
			}
		});
	}
}

// modal 채팅방
function addChatRoom() {
	const modalPop = $("#modal-addChatRoom");
	const modalBg = $(".modal-addChatRoom-bg");

	$(modalPop[0]).show();
	$(modalBg[0]).show();

	const friendList = $("#friend_list").find("#friend-list-box").find("li");
	let checkHtml = "";
	for (let i = 0; i < friendList.length; i++) {
		checkHtml += `<input type="checkbox" name="friend-modal" id="friend-modal-${friendList[i].id}">
			<label for="friend-modal-${friendList[i].id}">
			${friendList[i].outerHTML}
			</label>
			`;
	}

	$("#modal-chatroom-list-box").html(checkHtml);

	for (let i = 0; i < friendList.length; i++) {
		$($('#modal-chatroom-list-box').find('li')[i]).show();
	}

}

function modalAddChatRoomClose() {
	const modalPop = $("#modal-addChatRoom");
	const modalBg = $(".modal-addChatRoom-bg");

	$(modalPop[0]).hide();
	$(modalBg[0]).hide();
}

function search_modal(event) {
	let eventVal = event.target.value;
	// 친구 목록 보임
	let friendList = $('#modal-addChatRoom').find('li');
	let friendNames = $('#modal-addChatRoom').find('.friend-title');
	
	for (let i = 0; i < friendList.length; i++) {
		if (friendNames[i].textContent.match(eventVal)) {
			$(friendList[i]).show();
			$($('[name=friend-modal]')[i]).show();
		} else {
			$(friendList[i]).hide();
			$($('[name=friend-modal]')[i]).hide();
		}
	}
}
