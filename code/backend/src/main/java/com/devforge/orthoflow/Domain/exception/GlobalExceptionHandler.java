package com.devforge.orthoflow.Domain.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(PatientNotFoundException.class)
    public ResponseEntity<String> handlePatientNotFoundException(PatientNotFoundException patientNotFoundException){
        ResponseEntity<String> responseEntity = new ResponseEntity<>(patientNotFoundException.getMessage(), HttpStatus.NOT_FOUND);
        return responseEntity;
    }

    @ExceptionHandler(TokenNotFoundException.class)
    public ResponseEntity<String> handleTokenNotFoundException(TokenNotFoundException tokenNotFoundException){
        ResponseEntity<String> responseEntity = new ResponseEntity<>(tokenNotFoundException.getMessage(),HttpStatus.NOT_FOUND);
        return responseEntity;
    }
}
