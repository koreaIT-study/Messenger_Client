const SignUp = {
	authNumber: undefined,
	vaildate: false
}

function checkEmail() {
	const emailRegExp = /^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/i;
	const space = /\s/g;

	const email = document.querySelector('#email').value;
	const checkInput = document.querySelector('.checkInput');

	if (!emailRegExp.test(email)) {
		alert("이메일형식이 올바르지 않습니다.");
		return;
	}

	const param = {
		email
	}

	$.ajax({
		type: 'get',
		url: '/smtpRequest',
		data: param,
		success: function(response) {
			console.log("🚀 ~ file: sign_up.html ~ line 81 ~ checkEmail ~ response", response)
			checkInput.style.display = "inline-block";
			SignUp.authNumber = response;
			alert('인증번호가 전송되었습니다.' + response)
		}
	});
}

function checkAuthNumber() {
	const inputNumber = document.querySelector('#authNumInput').value;

	if (inputNumber === SignUp.authNumber) {
		alert('인증번호가 일치합니다.');
		SignUp.vaildate = true;
	} else {
		alert('인증번호가 일치하지 않습니다.');
		SignUp.vaildate = false;
	}
}


function signUp() {
	/*	if (!SignUp.vaildate) {
			alert('인증 번호를 확인해 주세요.');
			return;
		}*/

	const name = document.querySelector('#name').value;
	const email = document.querySelector('#email').value;
	const password = document.querySelector('#password').value;
	const passwordCheck = document.querySelector('#passwordCheck').value;



	if (password !== passwordCheck) {
		alert("비밀번호가 일치하지 않습니다.");
		return;
	}

	const file = document.querySelector('#profile').files[0];

	const formData = new FormData();
	formData.append('name', name);
	formData.append('email', email);
	formData.append('pwd', password);
	formData.append('file', file)

	$.ajax({
		url: "/signUp",
		type: `POST`,
		processData: false,
		contentType: false,
		data: formData,
		success: (response) => {
			alert('회원가입이 완료되었습니다.');
			location.href = '/';
		},
		error: (err) => {
			console.log(err.responseText);
		}
	})


}

function uploadImage() {
	const imgBtn = document.querySelector('.file_button');
	const imgInput = document.querySelector('#profile');
	const imgTag = document.querySelector('#profileImg');

	const file = () => {
		const selectedFile = imgInput.files[0];
		console.log("🚀 ~ file: sign_up.html ~ line 173 ~ file ~ selectedFile", selectedFile)
		const fileReader = new FileReader();
		fileReader.readAsDataURL(selectedFile);
		console.log("🚀 ~ file: sign_up.html ~ line 176 ~ file ~ fileReader", fileReader)

		if (!selectedFile.type.match("image/.*")) {
			alert('이미지 확장자만 업로드 가능합니다.');
			return;
		}

		fileReader.onload = function() {
			imgTag.src = fileReader.result;
		}
	};

	imgInput.addEventListener('change', file);
}