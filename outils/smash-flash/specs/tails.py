SPEC = dict(
    name='Tails', sheet='tailsbattle2.png', credit='Digi-Ex', region=(0, 0, 1100, 775), sounds='Tails', height=50,
    anims=dict(
        idle=['0.0', '0.5'], walk='11.0-11.7', run='10.1-10.4', crouch=['4.15'], jumpSquat=['4.15'],
        jump=['16.0'], doubleJump=['15.8', '15.9', '15.10'], fall=['16.1'], land=['4.15'],
        shield=['13.0'], dodge=['14.2'], roll='16.4-16.6', hurt=['17.0'], hurtAir=['17.2'], tumble=['16.5', '16.6', '16.7'],
        lie=['17.9'], getup=['4.15'], taunt=['8.13'], win=['8.14'],
        jab=['2.1', '2.2'], ftilt=['2.13', '2.14'], utilt=['1.7', '1.8'], dtilt=['2.5', '2.6'], dash=['3.0'],
        fsmash=['0.2', '0.3', '0.4'], usmash=['4.8', '4.9'], dsmash=['10.5'],
        nair='13.3-13.5', fair=['3.1'], uair=['1.6'], dair=['3.12', '3.13'],
        neutralB=['5.5', '5.7', '5.8'], sideB=['6.4', '6.5'], upB='15.8-15.11', downB=['13.10', '13.11'],
        grab=['2.17', '2.18'], proj=['5.10'],
    ),
    times=dict(idle=[30, 10], walk=6, run=4, doubleJump=4, upB=4, fsmash=[10, 5, 12]),
    proj_move=dict(move='neutralB', at=2, vx=7, vy=0, gravity=0.0, life=50, dmg=6, no_melee=True),
    moves=dict(upB=dict(vy=-9.5, helpless=True), downB=dict(hit=dict(dmg=10))),
    stats=dict(weight=80, walkSpeed=1.4, runSpeed=3.0, jumpForce=8.4, doubleJumpForce=8.0, jumps=3),
)
