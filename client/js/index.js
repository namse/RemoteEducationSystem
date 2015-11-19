$(window).on("load", function() {
    $("#classBtn").on("click", function() {
        // get param
        // - isTeacher : 1 or 0. isTeacher은 1 / 0 으로 true / false 구분해주세요~
        // - roomID : string of room ID.
        // - userName : string of user name
        // 주의 : isTeacher은 서버에서 true, false로 바꿀거임. class.js에는 isTeacher를 true or false로 받을 수 있음.
        window.open("/class?isTeacher=1&roomID=test&userName=Namse", "Remote Education System", "width=1080,height=720,scrollbars=no,toolbar=no");
    });
});